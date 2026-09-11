import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from ..models import Project, ScheduleActivity, DailyTask, User

def parse_date_safe(date_str: str) -> datetime:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        return datetime.now()

def parse_l5_l6_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Intelligently parses explicit L5 Work Packages and L6 Activities from
    user's workflow_scope or project description text.
    Handles multiple formats:
    - Explicit L5 / L6 tag structures (e.g. L5 - Foundation Works L6: Site clearing...)
    - Header & bullet point breakdowns (e.g. Foundation Works:\n- Site clearing)
    - Arrow-separated workflows (e.g. Step 1 -> Step 2 -> Step 3)
    - Dynamic Natural Language Clause & Scope NLP Parser
    """
    if not text or not text.strip():
        return []

    # Strategy 1: Explicit L5 / L6 tag parsing
    clean_text = re.sub(r'L5\s*(?:/|->|=>|to)\s*L6', '', text, flags=re.IGNORECASE)
    parts = re.split(r'(?:^|\s+)L5\s*(?:Work\s+Package|Package)?\s*[\:\-\–\.]?\s*', clean_text, flags=re.IGNORECASE)
    
    packages = []
    if len(parts) > 1:
        for part in parts[1:]:
            if not part.strip():
                continue
                
            l6_parts = re.split(r'(?:^|\s+)L6\s*(?:Activity|Work)?\s*[\:\-\–\.]?\s*', part, flags=re.IGNORECASE)
            l5_raw = l6_parts[0].strip()
            l5_name = re.sub(r'^(?:Work Package|Package|\-|\:|\s)+', '', l5_raw, flags=re.IGNORECASE).strip()
            l5_name = l5_name.split('\n')[0].strip()
            l5_name = re.sub(r'[\.\;\,\:]+$', '', l5_name).strip()

            if not l5_name or len(l5_name) < 2:
                continue
                
            l6_items = []
            for l6_part in l6_parts[1:]:
                l6_text = l6_part.strip()
                if not l6_text:
                    continue
                
                lines = [line.strip() for line in l6_text.splitlines() if line.strip()]
                l6_name = lines[0] if lines else l6_text
                l6_name = re.sub(r'[\.\;\,\:]+$', '', l6_name).strip()
                if len(l6_name) > 80:
                    l6_name = l6_name[:80].strip()
                if l6_name:
                    l6_items.append(l6_name)
                    
            if l5_name and l6_items:
                packages.append({
                    "l5": l5_name,
                    "l6_items": l6_items
                })
                
    if packages:
        return packages

    # Strategy 2: Line-based section / header parsing (only if multiple distinct lines)
    raw_lines = [line.strip() for line in text.splitlines() if line.strip()]
    has_explicit_headers = any(l.endswith(':') or bool(re.match(r'^(?:Phase|Package|Section|Module|[A-Z\s]{4,}\:|\d+\.)\s*', l, re.I)) for l in raw_lines)

    if len(raw_lines) > 1:
        curr_l5 = None
        curr_l6s = []
        for line in raw_lines:
            is_header = line.endswith(':') or bool(re.match(r'^(?:Phase|Package|Section|Module|\d+\.)\s+', line, re.I))
            if is_header:
                if curr_l5 and curr_l6s:
                    packages.append({"l5": curr_l5, "l6_items": curr_l6s})
                    curr_l6s = []
                curr_l5 = re.sub(r'[\:\-\–\.]+$', '', line).strip()
            else:
                # If explicit headers exist and we have not encountered one yet, this is intro text
                if has_explicit_headers and not curr_l5:
                    continue

                clean_item = re.sub(r'^[\-\*\•\d\.\)]+\s*', '', line).strip()
                if clean_item and len(clean_item) > 2:
                    # Ignore generic intro scope statements
                    if clean_item.lower().startswith(('project:', 'the project includes', 'project includes', 'scope includes')):
                        continue
                    if not curr_l5:
                        curr_l5 = "General Execution Package"
                    curr_l6s.append(clean_item)

        if curr_l5 and curr_l6s:
            packages.append({"l5": curr_l5, "l6_items": curr_l6s})

        if len(packages) > 1 or (len(packages) == 1 and len(packages[0]["l6_items"]) >= 2):
            return packages

    # Strategy 3: Arrow-separated workflow
    if '->' in text or '=>' in text:
        tokens = [t.strip() for t in re.split(r'->|=>', text) if t.strip()]
        if len(tokens) >= 2:
            return [{
                "l5": "Project Execution Sequence",
                "l6_items": tokens
            }]

    # Strategy 4: Dynamic Natural Language Scope & Clause NLP Parser
    clean_prose = re.sub(r'\s+', ' ', text).strip()
    # Split by periods, semicolons, commas, newlines, or conjunction phrases
    clauses = re.split(
        r'[\.\;\,\n]+|\b(?:including|followed by|with|and also|as well as|and)\b',
        clean_prose,
        flags=re.IGNORECASE
    )
    
    substructure_l6 = []
    superstructure_l6 = []
    mep_l6 = []
    finishing_l6 = []

    for raw_clause in clauses:
        clause = raw_clause.strip()
        if len(clause) < 3:
            continue
        
        clause_lower = clause.lower()
        # Trim generic prefix headers
        clause = re.sub(
            r'^(?:this project|scope includes|construction of|project for|site at|project|facility)\s*',
            '', clause, flags=re.IGNORECASE
        ).strip()
        
        if len(clause) < 3:
            continue

        item_title = clause.strip(' ,.-').title()
        if len(item_title) > 90:
            item_title = item_title[:90].strip()

        if any(k in clause_lower for k in ["earth", "soil", "site", "pile", "piling", "foundation", "excavation", "substructure", "mat", "cap", "trench", "grading"]):
            substructure_l6.append(item_title)
        elif any(k in clause_lower for k in ["pipe", "piping", "electrical", "cable", "conduit", "mep", "hvac", "cooling", "chiller", "power", "wiring", "plumbing", "drainage", "tie-in"]):
            mep_l6.append(item_title)
        elif any(k in clause_lower for k in ["tile", "plaster", "paint", "facade", "curtain wall", "glass", "finish", "flooring", "masonry", "rack", "fitout", "interior"]):
            finishing_l6.append(item_title)
        else:
            if len(item_title) > 4 and not any(item_title.lower().startswith(x) for x in ["nexacore", "facility", "project"]):
                superstructure_l6.append(item_title)

    nlp_packages = []
    if substructure_l6:
        nlp_packages.append({"l5": "Site Preparation & Substructure Works", "l6_items": substructure_l6})
    if superstructure_l6:
        nlp_packages.append({"l5": "Structural Superstructure & Framing", "l6_items": superstructure_l6})
    if mep_l6:
        nlp_packages.append({"l5": "MEP Utilities & Environmental Systems", "l6_items": mep_l6})
    if finishing_l6:
        nlp_packages.append({"l5": "Interior Fitout & Architectural Finishing", "l6_items": finishing_l6})

    if nlp_packages:
        return nlp_packages

    return []

def generate_execution_plan(project: Project, db: Session) -> Tuple[List[ScheduleActivity], List[DailyTask], int]:
    """
    Parses Project description and workflow_scope to derive structured L5 Work Packages,
    L6 Activities, and Day-wise executable tasks directly from provided text.
    """

    # Always clear existing activities & tasks for this project when generating/regenerating
    db.query(DailyTask).filter(DailyTask.project_id == project.id).delete(synchronize_session=False)
    db.query(ScheduleActivity).filter(ScheduleActivity.project_id == project.id).delete(synchronize_session=False)
    db.commit()

    combined_text = f"{project.name}\n{project.description or ''}\n{project.workflow_scope or ''}"
    text_lower = combined_text.lower()

    # Attempt to parse explicit L5 and L6 activities directly from text
    parsed_packages = parse_l5_l6_from_text(combined_text)
    
    domain_templates = []
    if parsed_packages:
        for p_idx, pkg in enumerate(parsed_packages):
            l5_title = pkg["l5"]
            l6_items_structured = []
            
            for idx, l6_name in enumerate(pkg["l6_items"]):
                name_lower = l6_name.lower()
                if any(k in name_lower for k in ["electric", "cable", "wiring", "conduit", "power"]):
                    disc = "Electrical"
                elif any(k in name_lower for k in ["girder", "lifting", "steel", "bearing", "erection", "structure"]):
                    disc = "Structural"
                elif any(k in name_lower for k in ["pipe", "piping", "plumbing", "drainage", "water"]):
                    disc = "Piping / Utilities"
                elif any(k in name_lower for k in ["hse", "safety", "inspection", "quality", "surveying", "testing"]):
                    disc = "HSE / QA"
                else:
                    disc = "Civil"
                
                code_words = [w[0].upper() for w in l5_title.split() if w and w[0].isalnum()]
                code_prefix = "".join(code_words)[:3] if code_words else "PKG"
                code = f"{code_prefix}-{idx+1:02d}"
                
                prefixes = [
                    f"{l6_name} — Preparation & Setup",
                    f"{l6_name} — Main Execution",
                    f"{l6_name} — Final Verification"
                ]
                
                l6_items_structured.append({
                    "name": l6_name,
                    "code": code,
                    "discipline": disc,
                    "days": 2 if len(pkg["l6_items"]) > 4 else 3,
                    "prefixes": prefixes
                })
                
            domain_templates.append({
                "l5": l5_title,
                "l6_items": l6_items_structured
            })
    else:
        # Fallback to standard domain templates if no explicit text breakdown was found
        if any(k in text_lower for k in ["data center", "datacenter", "nexacore", "server", "facility", "substation", "industrial"]):
            domain_templates = [
                {
                    "l5": "Site Preparation & Substructure Mat Foundation",
                    "l6_items": [
                        {"name": "Site Mass Excavation & Grading", "code": "DC-SUB-01", "discipline": "Civil", "days": 3, "prefixes": ["Site Clearing & Topsoil Removal", "Trench Excavation & Soil Compaction", "PCC Bedding & Waterproofing Slab"]},
                        {"name": "Heavy Concrete Foundation Mat Pour", "code": "DC-SUB-02", "discipline": "Civil", "days": 3, "prefixes": ["Rebar Cage Mesh Binding", "Shuttering & Anchor Bolt Placement", "Heavy Mass Concrete Pouring & Curing"]}
                    ]
                },
                {
                    "l5": "Structural Superstructure & Envelope",
                    "l6_items": [
                        {"name": "Structural Steel Column & Truss Erection", "code": "DC-STR-01", "discipline": "Structural", "days": 3, "prefixes": ["Main Column Heavy Lifting", "Roof Truss & Beam Torque Fastening", "Deck Slab Steel Sheeting Placement"]},
                        {"name": "Precast Wall Panels & Thermal Cladding", "code": "DC-STR-02", "discipline": "Civil / Architectural", "days": 2, "prefixes": ["Insulated Wall Panel Mounting", "Roof Membrane Sealing & Weatherproofing"]}
                    ]
                },
                {
                    "l5": "MEP Utilities & Data Cooling Systems",
                    "l6_items": [
                        {"name": "HVAC Chiller Plant & Cooling Towers", "code": "DC-MEP-01", "discipline": "MEP / Mechanical", "days": 3, "prefixes": ["Chiller Unit Base Rigging", "Cooling Tower Piping Tie-In", "Chilled Water Ductwork Installation"]},
                        {"name": "Dual High-Voltage Power & Busway Wiring", "code": "DC-MEP-02", "discipline": "Electrical", "days": 3, "prefixes": ["Transformer Seating & Earthing Grid", "Main Switchgear & UPS Battery Installation", "Overhead Cable Tray & Busway Distribution"]}
                    ]
                },
                {
                    "l5": "Interior Server Hall Fitout & Security",
                    "l6_items": [
                        {"name": "Raised Floor Grid & Server Rack Mounting", "code": "DC-FIT-01", "discipline": "Fitout / Structural", "days": 2, "prefixes": ["Anti-Static Raised Pedestal Grid", "Server Rack Suite Positioning & Anchoring"]},
                        {"name": "Fire Suppression & Security Containment", "code": "DC-FIT-02", "discipline": "HSE / QA", "days": 2, "prefixes": ["Gas Clean-Agent Fire Line Testing", "Biometric Access & Containment Partition Testing"]}
                    ]
                }
            ]
        elif any(k in text_lower for k in ["bridge", "pier", "pile", "riverlink", "viaduct", "concrete", "foundation"]):
            domain_templates = [
                {
                    "l5": "Foundation Works",
                    "l6_items": [
                        {
                            "name": "Pile Construction",
                            "code": "FOUND-01",
                            "discipline": "Civil",
                            "days": 3,
                            "prefixes": ["Pile P1 — Boring & Drilling", "Pile P2 — Boring & Drilling", "Pile P3 — Reinforcement Cage Installation"]
                        },
                        {
                            "name": "Pile Cap Construction",
                            "code": "FOUND-02",
                            "discipline": "Civil",
                            "days": 2,
                            "prefixes": ["Pile Cap Rebar Binding", "Pile Cap Concrete Pouring"]
                        }
                    ]
                },
                {
                    "l5": "Pier Construction",
                    "l6_items": [
                        {
                            "name": "Pier Reinforcement",
                            "code": "SUB-01",
                            "discipline": "Civil",
                            "days": 3,
                            "prefixes": ["Reinforcement preparation", "Reinforcement fixing — Pier P1", "Reinforcement fixing — Pier P2"]
                        },
                        {
                            "name": "Pier Formwork & Concreting",
                            "code": "SUB-02",
                            "discipline": "Civil",
                            "days": 2,
                            "prefixes": ["Shuttering Assembly — Pier P1", "Concrete Pouring — Pier P1"]
                        }
                    ]
                },
                {
                    "l5": "Superstructure & Decking",
                    "l6_items": [
                        {
                            "name": "Girder Erection & Decking",
                            "code": "SUP-01",
                            "discipline": "Structural",
                            "days": 3,
                            "prefixes": ["Span 1 Girder Heavy Lifting", "Span 2 Girder Alignment", "Deck Slab Concrete Pouring"]
                        }
                    ]
                }
            ]
        elif any(k in text_lower for k in ["road", "highway", "corridor", "pavement", "expansion"]):
            domain_templates = [
                {
                    "l5": "Earthworks & Subgrade Preparation",
                    "l6_items": [
                        {"name": "Right of Way Clearing & Excavation", "code": "EARTH-01", "discipline": "Civil Works", "days": 2, "prefixes": ["Section A Clearing", "Section B Clearing"]},
                        {"name": "Subgrade Compaction & Testing", "code": "EARTH-02", "discipline": "Civil Works", "days": 2, "prefixes": ["Compaction Km 0-2", "Compaction Km 2-4"]}
                    ]
                },
                {
                    "l5": "Pavement & Base Course",
                    "l6_items": [
                        {"name": "Crushed Aggregate Base Course", "code": "PAVE-01", "discipline": "Civil Works", "days": 3, "prefixes": ["Base Laying Stretch 1", "Base Laying Stretch 2", "Base Laying Stretch 3"]},
                        {"name": "Asphalt Binder & Wearing Layer", "code": "PAVE-02", "discipline": "Civil Works", "days": 2, "prefixes": ["Binder Layer Laying", "Wearing Course Laying"]}
                    ]
                },
                {
                    "l5": "Road Appurtenances & Marking",
                    "l6_items": [
                        {"name": "Guardrail Installation & Road Marking", "code": "APP-01", "discipline": "Civil / Safety", "days": 2, "prefixes": ["Guardrail Fixing", "Thermoplastic Line Marking"]}
                    ]
                }
            ]
        else:
            domain_templates = [
                {
                    "l5": "Site Preparation & Foundation",
                    "l6_items": [
                        {"name": "Site Layout & Excavation", "code": "SITE-01", "discipline": "Civil Works", "days": 2, "prefixes": ["Boundary Marking", "Foundation Trench Excavation"]},
                        {"name": "Foundation Concrete & Rebar", "code": "SITE-02", "discipline": "Civil Works", "days": 3, "prefixes": ["Rebar Mesh Binding", "PCC Bedding Pour", "RCC Foundation Footing"]}
                    ]
                },
                {
                    "l5": "Structural Superstructure",
                    "l6_items": [
                        {"name": "Column & Beam Framing", "code": "STRUCT-01", "discipline": "Civil Works", "days": 3, "prefixes": ["Column Shuttering", "Column Reinforcement", "Beam Casting"]},
                        {"name": "Slab Concrete Casting", "code": "STRUCT-02", "discipline": "Civil Works", "days": 2, "prefixes": ["Slab Formwork", "Slab Concrete Pouring"]}
                    ]
                },
                {
                    "l5": "MEP & Finishing Works",
                    "l6_items": [
                        {"name": "Piping & Cable Tray Conduit Installation", "code": "MEP-01", "discipline": "Electrical / Piping", "days": 2, "prefixes": ["Conduit Routing", "Cable Tray Mounting"]},
                        {"name": "Masonry & Surface Plastering", "code": "FIN-01", "discipline": "Civil Works", "days": 2, "prefixes": ["Brickwork Laying", "Wall Plastering"]}
                    ]
                }
            ]

    # Date calculations
    start_dt = parse_date_safe(project.start_date)
    current_dt = start_dt

    created_activities: List[ScheduleActivity] = []
    created_tasks: List[DailyTask] = []
    flagged_count = 0

    # Determine if text is sparse (insufficient detail -> set flagged_for_review)
    is_sparse = len(project.workflow_scope or "") < 20 and len(project.description or "") < 20

    for l5_idx, pkg in enumerate(domain_templates):
        l5_name = pkg["l5"][:200].strip()

        # Create L5 Parent Schedule Activity
        l5_act_id = f"L5-{l5_idx + 1:02d}"
        l5_activity = ScheduleActivity(
            activity_id=l5_act_id,
            project_id=project.id,
            name=l5_name,
            l5_name=l5_name,
            l6_name=l5_name,
            wbs_level="L5",
            discipline="General Construction",
            planned_start=current_dt.strftime("%Y-%m-%d"),
            planned_finish=(current_dt + timedelta(days=7)).strftime("%Y-%m-%d"),
            planned_progress=100.0,
            actual_progress=0.0,
            status="Not Started",
            ai_confidence=95.0
        )
        db.add(l5_activity)
        db.flush()
        created_activities.append(l5_activity)

        for l6_item in pkg["l6_items"]:
            l6_name = str(l6_item["name"])[:200].strip()
            code = str(l6_item["code"])[:50].strip()
            disc = str(l6_item["discipline"])[:100].strip()
            days_count = l6_item["days"]
            prefixes = l6_item["prefixes"]

            l6_start = current_dt
            l6_finish = l6_start + timedelta(days=max(days_count - 1, 0))

            # Create L6 Schedule Activity
            l6_act = ScheduleActivity(
                activity_id=code,
                project_id=project.id,
                parent_l5_id=l5_activity.id,
                name=l6_name,
                l5_name=l5_name,
                l6_name=l6_name,
                wbs_level="L6",
                discipline=disc,
                planned_start=l6_start.strftime("%Y-%m-%d"),
                planned_finish=l6_finish.strftime("%Y-%m-%d"),
                planned_progress=100.0,
                actual_progress=0.0,
                status="Not Started",
                ai_confidence=90.0,
                location=(project.location or "Site Area")[:200]
            )
            db.add(l6_act)
            db.flush()
            created_activities.append(l6_act)

            # Generate Day-wise Executable Tasks for this L6 activity
            for day_i in range(days_count):
                task_date = l6_start + timedelta(days=day_i)
                prefix_name = prefixes[day_i] if day_i < len(prefixes) else f"Step {day_i + 1}"
                task_title = prefix_name if ("—" in prefix_name or l6_name.lower() in prefix_name.lower()) else f"{l6_name} — {prefix_name}"
                task_title = task_title[:200].strip()

                # Flag task if info is sparse or if last item in sequence needing quantity verification
                is_flagged = is_sparse or (day_i == days_count - 1 and l5_idx == len(domain_templates) - 1)
                review_note = None
                if is_flagged:
                    flagged_count += 1
                    review_note = "Generated from workflow scope. Please review planned quantity & worker assignment."

                daily_task = DailyTask(
                    project_id=project.id,
                    l6_activity_id=l6_act.id,
                    l5_name=l5_name,
                    l6_name=l6_name,
                    task_name=task_title,
                    planned_date=task_date.strftime("%Y-%m-%d"),
                    status="NOT_STARTED",
                    progress=0.0,
                    flagged_for_review=is_flagged,
                    review_notes=review_note
                )
                db.add(daily_task)
                created_tasks.append(daily_task)

            # Increment date for next activity
            current_dt = l6_finish + timedelta(days=1)

    project.plan_status = "GENERATED"
    db.commit()

    return (created_activities, created_tasks, flagged_count)

