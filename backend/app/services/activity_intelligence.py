import re
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional, Tuple

# Domain Synonym Map for Infrastructure Construction
SYNONYM_MAP = {
    "reinforcement": ["rebar", "reinforcing", "binding", "mesh", "steel", "ties"],
    "rebar": ["reinforcement", "reinforcing", "binding", "mesh", "steel"],
    "shuttering": ["formwork", "shutter", "mould", "casing", "framing", "centering"],
    "formwork": ["shuttering", "shutter", "mould", "casing", "framing"],
    "pier": ["column", "pillar", "p3", "p2", "p1", "support", "substructure", "abutment"],
    "column": ["pier", "pillar", "post", "support", "p3"],
    "spool": ["pipe", "piping", "line", "duct"],
    "erection": ["install", "installation", "fitting", "assembly", "mounting", "erect"],
    "erect": ["install", "erection", "assembly"],
    "concreting": ["pour", "pouring", "casting", "concrete"],
    "pour": ["concreting", "pouring", "casting"],
    "excavation": ["digging", "trenching", "earthwork", "cutting"],
    "pavement": ["asphalt", "bitumen", "roadwork", "subbase"]
}

def convert_time_to_24h(time_str: str) -> str:
    """Convert time string like '9 AM' or '5:30 PM' or '9 baje' or '17:00' to 'HH:MM' 24h format."""
    clean = re.sub(r"\s*(baje|o'clock|hrs|hours)$", "", time_str.strip().lower())
    
    # Handle direct HH:MM format
    match_24 = re.match(r"^(\d{1,2}):(\d{2})$", clean)
    if match_24:
        h, m = int(match_24.group(1)), int(match_24.group(2))
        return f"{h:02d}:{m:02d}"

    # Handle 9 AM / 5 PM / 5:30 PM / 9
    match_12 = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$", clean)
    if match_12:
        h = int(match_12.group(1))
        m = int(match_12.group(2)) if match_12.group(2) else 0
        ampm = match_12.group(3)
        if ampm == "pm" and h < 12:
            h += 12
        elif ampm == "am" and h == 12:
            h = 0
        return f"{h:02d}:{m:02d}"

    return time_str


def parse_report_text(raw_text: str) -> Dict[str, Any]:
    """
    Process natural language report text to extract structured fields:
    actual_start, actual_end, extracted_progress, quantity, unit, issues
    """
    result = {
        "actual_start": None,
        "actual_end": None,
        "extracted_progress": None,
        "quantity": None,
        "unit": None,
        "issues": None
    }

    if not raw_text:
        return result

    text = raw_text.strip()
    text_lower = text.lower()

    # 1. Start and End Time Extraction
    # Pattern: Started at 9 AM and finished at 5 PM / from 9:00 AM to 5:00 PM / 9 AM to 5 PM
    time_range_pattern = r"(?:started|from|began)?\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje)?)\s*(?:and|to|-|until)\s*(?:finished|ended|completed|at|\s)*\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje)?)"
    time_match = re.search(time_range_pattern, text_lower)

    if time_match and time_match.group(1) and time_match.group(2):
        if re.match(r"^\d", time_match.group(1).strip()):
            result["actual_start"] = convert_time_to_24h(time_match.group(1))
            result["actual_end"] = convert_time_to_24h(time_match.group(2))
    
    if not result["actual_start"]:
        # Check single start time like "9 baje start" or "started at 9 AM"
        single_start_pattern = r"(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje)?)\s*(?:baje|aaj|at)?\s*(?:start|started|began|shuru)"
        single_start_match = re.search(single_start_pattern, text_lower)
        if single_start_match:
            result["actual_start"] = convert_time_to_24h(single_start_match.group(1))
            result["actual_end"] = None
        else:
            single_start_pattern2 = r"(?:started|began|shuru)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje)?)"
            single_start_match2 = re.search(single_start_pattern2, text_lower)
            if single_start_match2:
                result["actual_start"] = convert_time_to_24h(single_start_match2.group(1))
                result["actual_end"] = None
            elif "started" in text_lower or "began" in text_lower or "shuru" in text_lower:
                result["actual_start"] = "today"
                result["actual_end"] = None

    # 2. Progress Percentage & Quantity Scope Extraction
    result["event_type"] = "PROGRESS_UPDATE"

    # Pattern 1: 15 out of 100 / 15 metres out of the planned 100 metres / 3/5 units
    ratio_pattern = r"(\d+(?:\.\d+)?)\s*(?:[a-zA-Z]+\s*){0,2}(?:out\s*of|\/)\s*(?:[a-zA-Z]+\s*){0,3}(\d+(?:\.\d+)?)"
    ratio_match = re.search(ratio_pattern, text_lower)

    if ratio_match:
        n1 = float(ratio_match.group(1))
        n2 = float(ratio_match.group(2))
        if n2 > 0 and n1 <= n2:
            result["extracted_progress"] = round((n1 / n2) * 100.0, 1)
            result["quantity"] = n1

    # Pattern 2: 70% or 75.5% or 70 percent
    if result["extracted_progress"] is None:
        pct_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:%|percent)", text_lower)
        if pct_match:
            result["extracted_progress"] = float(pct_match.group(1))

    # Keyword completion & Event Type Classification
    if result["extracted_progress"] is None:
        if any(w in text_lower for w in ["done", "completed", "finished", "ready", "complete", "poured", "erected", "installed", "cured", "cast"]):
            result["extracted_progress"] = 100.0
            result["event_type"] = "ACTUAL_FINISH"
        elif any(w in text_lower for w in ["started", "start", "starting", "began", "commenced", "initiated", "shuru"]):
            result["event_type"] = "ACTUAL_START"
            result["extracted_progress"] = None
        else:
            # If no completion metric, ratio, keyword, or start event is present, return None (Insufficient data)
            result["extracted_progress"] = None

    # 3. Quantity & Unit Extraction
    qty_unit_pattern = r"(?:completed|installed|poured|erected|finished|done)?\s*(\d+(?:\.\d+)?)\s*(meters|m|columns|piers|units|tons|sqm|m2|lm|spools|panels|segments|supports)"
    qty_match = re.search(qty_unit_pattern, text_lower)
    if qty_match:
        if result["quantity"] is None:
            result["quantity"] = float(qty_match.group(1))
        result["unit"] = qty_match.group(2)

    # 4. Issue / Blocker Extraction
    issue_keywords = ["issue", "delay", "blocked", "rain", "breakdown", "waiting", "shortage", "stuck", "problem", "discrepancy"]
    for kw in issue_keywords:
        if kw in text_lower:
            sentences = re.split(r"[.\n]", text)
            for s in sentences:
                if kw in s.lower():
                    result["issues"] = s.strip()
                    break
            break

    return result


def normalize_tokens(text: str) -> List[str]:
    """Tokenize and expand tokens with domain synonyms."""
    if not text:
        return []
    words = re.findall(r"\w+", text.lower())
    stop_words = {"the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with", "we", "today", "completed", "done", "around", "about"}
    tokens = [w for w in words if w not in stop_words and len(w) > 1]
    
    expanded = set(tokens)
    for t in tokens:
        if t in SYNONYM_MAP:
            expanded.update(SYNONYM_MAP[t])
    return list(expanded)


def compute_string_similarity(a: str, b: str) -> float:
    """Calculate Levenshtein-based similarity ratio between two strings."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def match_l5_l6_activity(
    raw_text: str,
    project_activities: List[Any],
    threshold: float = 0.30
) -> Tuple[Optional[Any], float, List[Dict[str, Any]], List[str], str]:
    """
    Match natural language worker input against project's L5/L6 activities.
    """
    if not project_activities or not raw_text:
        return (None, 0.0, [], ["No project activities available to match."], "Automatically Matched")

    raw_tokens = set(normalize_tokens(raw_text))
    raw_lower = raw_text.lower()

    scored_candidates = []

    for act in project_activities:
        act_name = getattr(act, "name", "")
        act_code = getattr(act, "activity_id", "")
        l5_name = getattr(act, "l5_name", "") or ""
        l6_name = getattr(act, "l6_name", "") or ""
        discipline = getattr(act, "discipline", "") or ""

        # 1. Direct Exact Code Match (e.g., CIV-034)
        if act_code and act_code.lower() in raw_lower:
            scored_candidates.append({
                "activity": act,
                "confidence": 0.98,
                "reason": f"Direct activity code match '{act_code}' in report text."
            })
            continue

        # 2. Token Set Intersection
        target_str = f"{act_name} {l5_name} {l6_name} {discipline}"
        target_tokens = set(normalize_tokens(target_str))

        intersection = raw_tokens.intersection(target_tokens)
        token_sim = (len(intersection) / max(len(raw_tokens), 1)) if raw_tokens else 0.0

        # 3. String Similarity on Name / L6 Name
        name_sim = max(
            compute_string_similarity(raw_text, act_name),
            compute_string_similarity(raw_text, l6_name),
            compute_string_similarity(raw_text, f"{l5_name} {l6_name}")
        )

        # Combined Weighted Confidence Score
        combined_conf = round(0.5 * name_sim + 0.5 * token_sim, 2)

        # Apply entity specificity boost ONLY if core action matches
        if "reinforcement" in raw_lower and "reinforcement" in act_name.lower():
            combined_conf = min(0.96, combined_conf + 0.15)
        elif "spool" in raw_lower and "spool" in act_name.lower():
            combined_conf = min(0.96, combined_conf + 0.15)
        elif "pier" in raw_lower and "pier" in act_name.lower():
            combined_conf = min(0.96, combined_conf + 0.15)
        elif "concrete" in raw_lower and ("concrete" in act_name.lower() or "pour" in act_name.lower()):
            combined_conf = min(0.96, combined_conf + 0.15)

        scored_candidates.append({
            "activity": act,
            "confidence": combined_conf,
            "reason": f"Semantic token overlap ({len(intersection)} shared terms) & string similarity ({int(name_sim*100)}%)."
        })

    # Sort candidates by confidence descending
    scored_candidates.sort(key=lambda x: x["confidence"], reverse=True)

    top_candidate = scored_candidates[0] if scored_candidates else None
    top_activity = top_candidate["activity"] if top_candidate else (project_activities[0] if project_activities else None)
    top_confidence = top_candidate["confidence"] if top_candidate else 0.0

    # Generate Candidate Matches List (formatted for API/UI)
    candidate_list = []
    for cand in scored_candidates[:3]:
        a = cand["activity"]
        candidate_list.append({
            "activity_id": a.id,
            "activity_code": a.activity_id,
            "activity_name": a.name,
            "l5_name": a.l5_name or "Work Package",
            "confidence": cand["confidence"],
            "reason": cand["reason"]
        })

    # Determine status and reasoning based on threshold
    if top_confidence >= threshold and top_activity:
        status = "Automatically Matched"
        reasoning = [
            f"AI matched worker text to '{top_activity.name}'",
            f"Domain synonym & token match score: {int(top_confidence * 100)}%",
            "Auto-linking activity and updating progress bar immediately."
        ]
    else:
        status = "Pending Review" if top_candidate else "Unmatched"
        act_name = top_activity.name if top_activity else "activity"
        reasoning = [
            f"Confidence score {int(top_confidence * 100)}% is below threshold ({int(threshold * 100)}%)",
            f"Closest candidate is '{act_name}', flagged for manual supervisor confirmation."
        ]

    return (top_activity, round(float(top_confidence), 3), candidate_list, reasoning, status)
