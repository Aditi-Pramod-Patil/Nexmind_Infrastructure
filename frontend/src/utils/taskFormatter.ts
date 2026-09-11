// Utility to format construction tasks, activities, and work packages systematically for clean readability

export interface FormattedTaskInfo {
  cleanPackageName: string;
  subPackageName?: string;
  displayTitle: string;
  stageBadge?: string;
  scopeItems: string[];
  subtasks: string[];
  fullSummary?: string;
}

// Convert ALL CAPS or messy text into Title Case
export function toTitleCase(str: string): string {
  if (!str) return '';
  // Check if string is predominantly uppercase
  const letters = str.replace(/[^a-zA-Z]/g, '');
  const isAllUpper = letters.length > 3 && letters === letters.toUpperCase();

  if (isAllUpper) {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        if (!word) return '';
        // Keep standard acronyms
        const upper = word.toUpperCase();
        if (['HVAC', 'MEP', 'UPS', 'CCTV', 'DG', 'ELV', 'ICT', 'PCC', 'RCC', 'HT', 'LT', 'BMS'].includes(upper)) {
          return upper;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
  return str;
}

// Sanitize weird encoding characters like replacement characters
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\uFFFD]/g, '—')
    .replace(/\s*—\s*/g, ' — ')
    .trim();
}

/**
 * Parses raw task text into a systematic, easy-to-read structure:
 * - Clean title
 * - Extracted phase/stage
 * - Structured scope items (for multi-discipline tasks)
 * - Removes duplicates between package, activity, and task name
 */
export function formatTaskForDisplay(task: {
  l5_name?: string;
  l6_name?: string;
  task_name?: string;
}): FormattedTaskInfo {
  const rawL5 = sanitizeText(task.l5_name || 'General Work Package');
  const rawL6 = sanitizeText(task.l6_name || '');
  const rawTaskName = sanitizeText(task.task_name || rawL6 || 'Field Task');

  const cleanPackageName = toTitleCase(rawL5);

  let displayTitle = rawTaskName;
  let stageBadge: string | undefined;
  let scopeItems: string[] = [];

  // 1. Check for stage separators: " — Preparation & Setup", " — Main Execution", etc.
  if (displayTitle.includes(' — ')) {
    const parts = displayTitle.split(' — ');
    displayTitle = parts[0].trim();
    stageBadge = parts.slice(1).join(' — ').trim();
  }

  // 2. Detect multi-item descriptions or "The project includes..." / "...activities include..."
  const includesPattern = /^(?:the\s+project\s+includes|project\s+includes|activities\s+include|scope\s+includes|includes)\s+/i;
  const specificActivitiesPattern = /^(.*?)\s+(?:activities\s+include|includes)\s+(.*)$/i;

  if (includesPattern.test(displayTitle)) {
    // e.g. "The project includes civil construction, structural works, architectural finishing, HVAC..."
    const itemsPart = displayTitle.replace(includesPattern, '').trim();
    displayTitle = 'Civil, Structural & MEP Systems Execution';
    
    // Parse comma-separated items
    const rawItems = itemsPart.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    scopeItems = rawItems.map(item => toTitleCase(item.replace(/\band\b/gi, '&').replace(/[.,]$/, '').trim()));
  } else if (specificActivitiesPattern.test(displayTitle)) {
    // e.g. "Electrical activities include transformer foundation preparation, cable laying..."
    const match = displayTitle.match(specificActivitiesPattern);
    if (match) {
      const subject = match[1].trim();
      const itemsPart = match[2].trim();
      displayTitle = `${toTitleCase(subject)} Works`;
      const rawItems = itemsPart.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      scopeItems = rawItems.map(item => toTitleCase(item.replace(/\band\b/gi, '&').replace(/[.,]$/, '').trim()));
    }
  } else if (displayTitle.split(',').length >= 3) {
    // Comma-separated list of scopes
    const rawItems = displayTitle.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    displayTitle = toTitleCase(rawItems[0]);
    scopeItems = rawItems.slice(1).map(item => toTitleCase(item.replace(/\band\b/gi, '&').replace(/[.,]$/, '').trim()));
  } else {
    displayTitle = toTitleCase(displayTitle);
  }

  // 3. Clean sub-package name only if it's distinctly different from package and displayTitle
  let subPackageName: string | undefined;
  if (rawL6) {
    const cleanL6 = toTitleCase(rawL6);
    const isDuplicate = 
      cleanL6.toLowerCase() === cleanPackageName.toLowerCase() ||
      cleanL6.toLowerCase() === rawTaskName.toLowerCase() ||
      cleanL6.toLowerCase().includes(displayTitle.toLowerCase()) ||
      displayTitle.toLowerCase().includes(cleanL6.toLowerCase());

    if (!isDuplicate && cleanL6.length < 50) {
      subPackageName = cleanL6;
    }
  }

  // 4. Generate sequential subtasks for the daily task
  const subtasks = extractSequentialSubtasks({
    task_name: rawTaskName,
    l6_name: rawL6,
    l5_name: rawL5,
    stageBadge,
    scopeItems
  });

  return {
    cleanPackageName,
    subPackageName,
    displayTitle,
    stageBadge,
    scopeItems,
    subtasks,
    fullSummary: rawTaskName !== displayTitle && scopeItems.length === 0 ? rawTaskName : undefined,
  };
}

export function extractSequentialSubtasks(task: {
  l5_name?: string;
  l6_name?: string;
  task_name?: string;
  stageBadge?: string;
  scopeItems?: string[];
}): string[] {
  // If explicit comma-separated scope items exist, use them sequentially
  if (task.scopeItems && task.scopeItems.length >= 2) {
    return task.scopeItems;
  }

  const raw = `${task.task_name || ''} ${task.l6_name || ''} ${task.l5_name || ''} ${task.stageBadge || ''}`.toLowerCase();

  // 1. Civil: Boring & Piling
  if (raw.includes('boring') || raw.includes('pile') || raw.includes('drilling')) {
    return [
      'Piling rig center alignment & hydraulic mast stabilization',
      'Continuous auger boring & soil excavation to design depth',
      'Bentonite slurry circulation & borehole bottom desanding',
      'Reinforcement cage lowering & tremie pipe concrete pumping'
    ];
  }

  // 2. Civil: Rebar / Reinforcement
  if (raw.includes('rebar') || raw.includes('reinforcement') || raw.includes('binding') || raw.includes('steel cage')) {
    return [
      'Rebar cutting, bending & transport to structural grid bay',
      'Main longitudinal bar spacing, leveling & vertical lap tying',
      'Lateral tie-wire binding of stirrups & column ring links',
      'Concrete cover spacer block fixing & clearance verification'
    ];
  }

  // 3. Civil: Shuttering & Formwork
  if (raw.includes('shuttering') || raw.includes('formwork') || raw.includes('props')) {
    return [
      'Clean shuttering panels & apply mold release agent',
      'Erect formwork panels, tie-rods & PVC spacer sleeves',
      'Laser plumb-line alignment & lateral prop turnbuckle bracing',
      'Foam tape joint sealing to prevent cement slurry leakage'
    ];
  }

  // 4. Civil: Concrete Pouring & Casting
  if (raw.includes('concrete') || raw.includes('pour') || raw.includes('casting') || raw.includes('slab')) {
    return [
      'Formwork pre-pour washdown & rebar clearance verification',
      'Batch transit mixer slump test & pump hose positioning',
      'Controlled concrete pour with continuous needle immersion vibration',
      'Surface screeding, power-trowel leveling & burlap wet curing'
    ];
  }

  // 5. Civil: Masonry, Brickwork & Blockwork
  if (raw.includes('masonry') || raw.includes('brick') || raw.includes('block') || raw.includes('mortar')) {
    return [
      'Mortar mixing, bed preparation & corner lead plumb setup',
      'Staggered brick/block course laying with spirit level alignment',
      'Joint raking, wall tie insertion & lintel support placement',
      'Mortar joint pointing, clean wipe down & water curing'
    ];
  }

  // 6. Civil: Plastering & Rendering
  if (raw.includes('plaster') || raw.includes('rendering') || raw.includes('putty')) {
    return [
      'Wall surface hacking, wire brushing & water saturation',
      'Leveling button (bull-mark) fixing & chicken mesh alignment',
      'Base coat cement plaster application & straight-edge screeding',
      'Sponge float finish, groove cutting & moist curing'
    ];
  }

  // 7. Structural: Steel Erection, Trusses, Columns & Beams
  if (raw.includes('steel') || raw.includes('column') || raw.includes('truss') || raw.includes('beam') || raw.includes('girder') || raw.includes('framing')) {
    return [
      'Crane rigging, sling inspection & heavy steel member hoisting',
      'Baseplate seating, leveling shims & anchor bolt alignment',
      'Connecting beam positioning & HSFG bolt torque fastening',
      'Diagonal cross-bracing installation & anti-corrosive touch-up'
    ];
  }

  // 8. Earthworks: Excavation, Grading & Compaction
  if (raw.includes('excavat') || raw.includes('earthwork') || raw.includes('clearing') || raw.includes('trench') || raw.includes('grading')) {
    return [
      'Survey boundary pegging & underground utility scanning',
      'Excavator bulk trench digging & earth spoil removal',
      'Trench bottom manual grading & laser bed depth checking',
      'Vibratory plate compactor soil compaction & density test'
    ];
  }

  // 9. Infrastructure: Road, Paving & Asphalt
  if (raw.includes('road') || raw.includes('paving') || raw.includes('asphalt') || raw.includes('highway') || raw.includes('subgrade')) {
    return [
      'Subgrade grading, laser level check & moisture conditioning',
      'Granular sub-base (GSB) aggregate spreading & leveling',
      'Heavy tandem vibratory roller compaction to target dry density',
      'Bituminous tack coat spray & asphalt wearing course paving'
    ];
  }

  // 10. MEP: Cable, Electrical & Wiring
  if (raw.includes('cable') || raw.includes('electrical') || raw.includes('wiring') || raw.includes('conduit') || raw.includes('tray')) {
    return [
      'Support trapeze hanger drilling & perforated cable tray bolting',
      'PVC/GI conduit routing, pull-box mounting & wire pulling',
      'Core identification, stripping, glanding & lug crimping',
      'Megger insulation resistance testing & circuit tagging'
    ];
  }

  // 11. MEP: Switchgear, Panel, Transformer & Substation
  if (raw.includes('transformer') || raw.includes('switchgear') || raw.includes('panel') || raw.includes('ups') || raw.includes('substation')) {
    return [
      'Equipment plinth channel alignment & anti-vibration pad seating',
      'Panel suite positioning, mechanical coupling & base anchoring',
      'Main busbar joint torquing & copper earth bonding',
      'Control wiring termination, ferrule tagging & breaker test'
    ];
  }

  // 12. MEP: Piping, Spool & Plumbing
  if (raw.includes('pipe') || raw.includes('spool') || raw.includes('header') || raw.includes('plumbing') || raw.includes('drainage')) {
    return [
      'Pipe spool staging, bevel end cleaning & pipe stand support setup',
      'Flange alignment, neoprene gasket fitting & tack welding',
      'Full root & cap pass welding with joint cooling check',
      'Hydrostatic pressure leak testing & thermal insulation wrap'
    ];
  }

  // 13. MEP: HVAC, Chiller, Duct & Ventilation
  if (raw.includes('hvac') || raw.includes('duct') || raw.includes('ventilation') || raw.includes('chiller') || raw.includes('cooling')) {
    return [
      'Threaded rod unistrut hanger anchoring to ceiling slab',
      'Galvanized iron duct segment hoisting & flange gasket bolting',
      'Fire damper, volume control damper & flexible connector fixing',
      'Air duct static pressure testing & acoustic insulation wrapping'
    ];
  }

  // 14. Fitout: Raised Floor, Server Rack & Modular Fitout
  if (raw.includes('server') || raw.includes('rack') || raw.includes('floor') || raw.includes('pedestal')) {
    return [
      'Laser leveling of floor pedestal grid & epoxy subfloor bonding',
      'Stringer interlocking & anti-static panel precision laying',
      'Server rack suite positioning, anchoring & seismic bracing',
      'Copper earth bonding strip connection & continuity check'
    ];
  }

  // 15. Fitout: Drywall, Partition, Ceiling & Glazing
  if (raw.includes('partition') || raw.includes('drywall') || raw.includes('ceiling') || raw.includes('glazing') || raw.includes('door')) {
    return [
      'Floor & ceiling track layout marking & screw anchoring',
      'Vertical stud framing at 400/600mm centers with noggins',
      'Acoustic insulation batt infill & gypsum board screw fixing',
      'Joint tape embedding, skim coat plastering & sand smoothing'
    ];
  }

  // 16. Finishes: Painting & Waterproofing
  if (raw.includes('paint') || raw.includes('waterproof') || raw.includes('coating') || raw.includes('seal')) {
    return [
      'Surface cleaning, crack patch repair & primer coat application',
      'Waterproofing membrane torch-on / liquid elastomeric barrier coating',
      'Intermediate base coat roller application with uniform mil thickness',
      'Final topcoat protective finish & surface uniformity inspection'
    ];
  }

  // 17. Inspection / Quality Testing (Physical site engineering check)
  if (raw.includes('verification') || raw.includes('testing') || raw.includes('qa') || raw.includes('survey')) {
    return [
      'Total station survey setup & benchmark coordinate check',
      'Physical rebar spacing, concrete cover & plumb line measurement',
      'Bolt torque tension calibration & weld joint dye-penetrant test',
      'Field density / slump batch testing & site engineer sign-off'
    ];
  }

  // 18. Universal Construction Work Fallback (Everyday physical site execution)
  return [
    'Work zone survey layout, datum mark transfer & material staging',
    'Component cutting, structural member positioning & initial fit-up',
    'Mechanical fastening, structural tie bonding & joint alignment',
    'Surface leveling, de-shuttering & protective curing application'
  ];
}
