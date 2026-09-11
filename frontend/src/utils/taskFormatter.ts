// Utility to format construction tasks, activities, and work packages systematically for clean readability

export interface FormattedTaskInfo {
  cleanPackageName: string;
  subPackageName?: string;
  displayTitle: string;
  stageBadge?: string;
  scopeItems: string[];
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

  return {
    cleanPackageName,
    subPackageName,
    displayTitle,
    stageBadge,
    scopeItems,
    fullSummary: rawTaskName !== displayTitle && scopeItems.length === 0 ? rawTaskName : undefined,
  };
}
