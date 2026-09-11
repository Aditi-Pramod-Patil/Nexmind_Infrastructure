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

  const raw = `${task.task_name || ''} ${task.l6_name || ''} ${task.stageBadge || ''}`.toLowerCase();

  // Domain-specific step breakdown
  if (raw.includes('verification') || raw.includes('safety inspection') || raw.includes('inspection')) {
    return [
      'Site safety briefing & PPE compliance verification',
      'Structural alignment & physical tolerance check',
      'Conduit, fittings & MEP interface inspection',
      'Daily site execution log & supervisor sign-off'
    ];
  }

  if (raw.includes('boring') || raw.includes('pile') || raw.includes('drilling')) {
    return [
      'Position hydraulic piling rig & verify center alignment',
      'Soil boring & excavation to target design depth',
      'Bentonite slurry circulation & borehole cleaning',
      'Depth caliper check & reinforcement cage placement'
    ];
  }

  if (raw.includes('rebar') || raw.includes('reinforcement') || raw.includes('binding')) {
    return [
      'Cut, bend and transport rebar bundles to work zone',
      'Grid layout marking & primary rebar positioning',
      'Tie-wire binding of vertical bars & horizontal stirrups',
      'Concrete spacer block fixing & cover clearance check'
    ];
  }

  if (raw.includes('shuttering') || raw.includes('formwork')) {
    return [
      'Clean shuttering panels & apply formwork release agent',
      'Erect formwork panels & secure external tie-rods',
      'Laser plumb-line alignment & lateral prop bracing',
      'Joint sealing check to prevent cement slurry leakage'
    ];
  }

  if (raw.includes('concrete') || raw.includes('pour') || raw.includes('casting')) {
    return [
      'Pre-pour checklist: Rebar, formwork & cleanliness sign-off',
      'Concrete batch transit mixer inspection & slump test',
      'Controlled concrete pour with continuous needle vibration',
      'Top surface screeding, leveling & initial wet curing setup'
    ];
  }

  if (raw.includes('pipe') || raw.includes('spool') || raw.includes('header')) {
    return [
      'Rigging and crane hoisting of spool pipe segments',
      'Flange alignment, bevel cleaning & tack welding',
      'Full root & cap pass welding of pipe joint',
      'Non-destructive testing (NDT) & joint inspection'
    ];
  }

  if (raw.includes('cable') || raw.includes('electrical') || raw.includes('wiring')) {
    return [
      'Perforated cable tray & conduit bracket installation',
      'Cable drum positioning, pulling & trunking containment',
      'Core identification, stripping & gland termination',
      'Insulation resistance megger test & circuit tagging'
    ];
  }

  if (raw.includes('hvac') || raw.includes('duct') || raw.includes('ventilation')) {
    return [
      'Duct hanger anchor drilling & threaded rod hanging',
      'Sheet metal duct section lifting & gasket joint sealing',
      'Damper & diffuser installation with acoustic insulation',
      'Airflow static pressure testing & smoke damper check'
    ];
  }

  if (raw.includes('excavat') || raw.includes('earthwork') || raw.includes('clearing')) {
    return [
      'Survey boundary pegging & underground utility marking',
      'JCB/Excavator bulk trench digging & topsoil stripping',
      'Grade leveling & laser level bed depth checking',
      'Vibratory roller soil compaction & moisture density test'
    ];
  }

  if (raw.includes('server') || raw.includes('rack') || raw.includes('floor')) {
    return [
      'Laser leveling of floor pedestal grid & stringers',
      'Anti-static floor panel laying & cable grommet cutouts',
      'Server rack positioning, bolting & seismic anchoring',
      'Earth bonding & protective grounding verification'
    ];
  }

  // Fallback for general execution tasks
  const title = task.stageBadge || task.task_name || 'Scheduled Activity';
  const cleanAction = toTitleCase(title.split('—')[0].trim());
  return [
    'Work zone safety briefing, tool inspection & area setup',
    `Execute primary activity: ${cleanAction}`,
    'Dimensional verification & engineering tolerance check',
    'Daily field log recording & supervisor progress sign-off'
  ];
}
