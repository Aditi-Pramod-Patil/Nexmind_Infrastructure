import { MOCK_PROJECTS } from '../data/mockData';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//${hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

export function getAuthToken(): string | null {
  return localStorage.getItem('siteflow_jwt_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('siteflow_jwt_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('siteflow_jwt_token');
}

function getLocalProjectsStore(): any[] {
  try {
    const stored = localStorage.getItem('siteflow_local_projects');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return [...MOCK_PROJECTS];
}

function saveLocalProjectsStore(projects: any[]) {
  try {
    localStorage.setItem('siteflow_local_projects', JSON.stringify(projects));
  } catch (e) {}
}

function getLocalSiteImagesStore(): any[] {
  try {
    const stored = localStorage.getItem('siteflow_local_site_images');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return [];
}

function saveLocalSiteImagesStore(images: any[]) {
  try {
    localStorage.setItem('siteflow_local_site_images', JSON.stringify(images));
  } catch (e) {}
}

function handleOfflineFallback(endpoint: string, options: RequestInit = {}): any {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // POST /projects
  if (endpoint === '/projects' && method === 'POST') {
    const projects = getLocalProjectsStore();
    const newCode = body.code?.trim() ? body.code.trim().toUpperCase() : `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAccessCode = `RLB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newProject = {
      id: `proj-${Date.now()}`,
      code: newCode,
      project_access_code: newAccessCode,
      name: body.name || 'New Project',
      project_type: body.project_type || 'Infrastructure',
      description: body.description || '',
      client: body.client || 'Enterprise Client',
      location: body.location || 'Site Area',
      start_date: body.start_date || '2026-09-01',
      target_completion: body.target_completion || '2027-06-30',
      baseline_progress: 0.0,
      actual_progress: 0.0,
      status: 'Active',
      employer_id: 'user-emp-1',
      disciplines: body.disciplines || ['Civil', 'Piping', 'Electrical', 'HSE']
    };

    projects.unshift(newProject);
    saveLocalProjectsStore(projects);
    return newProject;
  }

  // GET /projects
  if (endpoint === '/projects' && method === 'GET') {
    return getLocalProjectsStore();
  }

  // GET /projects/:id
  if (endpoint.startsWith('/projects/') && method === 'GET') {
    const parts = endpoint.split('/');
    if (parts.length === 3) {
      const projId = parts[2].trim().toLowerCase();
      const projects = getLocalProjectsStore();
      const match = projects.find(
        p =>
          p.id?.toString().toLowerCase() === projId ||
          p.code?.toString().toLowerCase() === projId
      );
      if (match) return match;

      return null;
    }
  }

  // GET /projects/:id/members
  if (endpoint.includes('/members') && method === 'GET') {
    return [];
  }

  // GET /projects/:id/workers
  if (endpoint.includes('/workers') && method === 'GET') {
    return [];
  }

  // GET /projects/:id/activities
  if (endpoint.includes('/activities') && method === 'GET') {
    return [];
  }

  // POST /projects/:id/activities
  if (endpoint.includes('/activities') && method === 'POST') {
    return {
      id: `act-${Date.now()}`,
      activity_id: body.activity_id || 'CIV-100',
      project_id: 'proj-1',
      name: body.name || 'New Activity',
      discipline: body.discipline || 'Civil Works',
      l5_name: body.l5_name || 'Structural Works',
      l6_name: body.l6_name || 'Reinforcement',
      wbs_level: 'L6',
      planned_start: body.planned_start || '2026-09-01',
      planned_finish: body.planned_finish || '2026-09-15',
      planned_progress: 100,
      actual_progress: 0,
      status: 'Not Started',
      ai_confidence: 90,
      delay_days: 0,
      risk_level: 'Low'
    };
  }

  // GET /projects/:id/execution-plan or /plan
  if (endpoint.includes('/execution-plan') || endpoint.includes('/plan') || endpoint.includes('/generate-plan')) {
    return {
      projectId: '',
      status: 'DRAFT',
      generatedAt: null,
      l5Activities: [],
      day_wise_tasks: [],
      flagged_tasks_count: 0,
      summary_notes: 'No execution plan generated yet. Generate a plan from the project details page.'
    };
  }

  // GET /projects/:id/site-images
  if (endpoint.includes('/site-images') && method === 'GET') {
    return getLocalSiteImagesStore();
  }

  // POST /site-images (offline fallback only — triggered when server is unreachable)
  if (endpoint === '/site-images' && method === 'POST') {
    const images = getLocalSiteImagesStore();
    // Try to extract a progress value from the worker's description for a more accurate offline result
    const desc: string = (body.description || '').toLowerCase();
    const pctMatch = desc.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
    const offlineProgress = pctMatch ? parseFloat(pctMatch[1]) : 65.0;
    const newImg = {
      id: `img-${Date.now()}`,
      project_id: body.project_id || 'proj-pune',
      image_url: body.image_url,
      description: body.description || 'Site photo',
      ai_status: 'analyzed_nlp_fallback',
      ai_confidence: 85.0,
      ai_progress_estimate: offlineProgress,
      detected_elements: {
        source: 'NLP_DESCRIPTION_FALLBACK',
        elements: [
          { class: 'rebar', count: 4, confidence: 0.91, label: 'Reinforcement / Rebar', phase: 'structural' },
          { class: 'formwork', count: 2, confidence: 0.88, label: 'Formwork / Shuttering', phase: 'structural' }
        ],
        summary: `Offline mode: Estimated progress ${offlineProgress}% from description. Connect to server for full AI vision analysis.`
      },
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    images.unshift(newImg);
    saveLocalSiteImagesStore(images);
    return newImg;
  }

  // GET /notifications
  if (endpoint === '/notifications' && method === 'GET') {
    return [];
  }

  // PUT /notifications/read-all or /notifications/:id/read
  if (endpoint.startsWith('/notifications') && method === 'PUT') {
    return { status: 'success' };
  }

  // POST /progress/text
  if (endpoint === '/progress/text' && method === 'POST') {
    return {
      id: `evt-${Date.now()}`,
      project_id: body.project_id || 'proj-pune',
      worker_id: 'user-wrk-1',
      worker_name: 'Field Worker',
      source_type: 'TEXT',
      raw_input: body.raw_text || '',
      extracted_progress: 50.0,
      actual_start: '08:00',
      actual_end: '16:00',
      match_confidence: 0.92,
      status: 'Automatically Matched',
      activity_code: null,
      activity_name: body.raw_text || 'Field Report',
      l5_name: 'Field Execution',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
  }

  // POST /progress/voice
  if (endpoint === '/progress/voice' && method === 'POST') {
    return {
      status: 'success',
      event: {
        id: `evt-${Date.now()}`,
        project_id: body.project_id || 'proj-pune',
        worker_id: 'user-wrk-1',
        worker_name: 'Field Worker',
        source_type: 'VOICE',
        raw_input: body.transcript || '',
        transcript: body.transcript || '',
        extracted_progress: 50.0,
        actual_start: '08:00',
        actual_end: '16:00',
        match_confidence: 0.95,
        status: 'Automatically Matched',
        activity_code: null,
        activity_name: body.transcript || 'Voice Report',
        l5_name: 'Field Execution',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
      }
    };
  }

  // POST /auth/login (offline demo accounts)
  if (endpoint === '/auth/login' && method === 'POST') {
    const DEMO_USERS: Record<string, { id: string; name: string; email: string; role: 'employer' | 'worker'; designation: string; department: string }> = {
      'aditi@example.com': {
        id: 'user-emp-1',
        name: 'Aditi Patil',
        email: 'aditi@example.com',
        role: 'employer',
        designation: 'Project Manager',
        department: 'Project Management'
      },
      'rahul@example.com': {
        id: 'user-wrk-1',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        role: 'worker',
        designation: 'Site Supervisor',
        department: 'Civil Construction'
      }
    };

    const emailKey = (body.email || '').toLowerCase().trim();
    const demoUser = DEMO_USERS[emailKey];

    if (demoUser && body.password === 'password123') {
      const offlineToken = `offline-jwt-${demoUser.id}-${Date.now()}`;
      // Store offline user session for /auth/me fallback
      localStorage.setItem('siteflow_offline_user', JSON.stringify(demoUser));
      return { access_token: offlineToken, user: demoUser };
    }

    // Check locally registered users
    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem('siteflow_local_users') || '[]');
      const localUser = localUsers.find(u => u.email.toLowerCase() === emailKey);
      if (localUser && localUser.password === body.password) {
        const { password: _pw, ...safeUser } = localUser;
        const offlineToken = `offline-jwt-${safeUser.id}-${Date.now()}`;
        localStorage.setItem('siteflow_offline_user', JSON.stringify(safeUser));
        return { access_token: offlineToken, user: safeUser };
      }
    } catch (e) {}

    throw new Error('Invalid email or password. Use aditi@example.com or rahul@example.com with password "password123".');
  }

  // POST /auth/register (offline)
  if (endpoint === '/auth/register' && method === 'POST') {
    try {
      const localUsers: any[] = JSON.parse(localStorage.getItem('siteflow_local_users') || '[]');
      const exists = localUsers.find(u => u.email.toLowerCase() === (body.email || '').toLowerCase());
      if (exists) throw new Error('An account with this email already exists.');

      const newUser = {
        id: `user-local-${Date.now()}`,
        name: body.name || 'New User',
        email: body.email,
        password: body.password,
        role: body.role || 'worker',
        designation: body.role === 'employer' ? 'Project Manager' : 'Site Worker',
        department: body.role === 'employer' ? 'Project Management' : 'Civil Construction'
      };
      localUsers.push(newUser);
      localStorage.setItem('siteflow_local_users', JSON.stringify(localUsers));
      const { password: _pw, ...safeUser } = newUser;
      const offlineToken = `offline-jwt-${safeUser.id}-${Date.now()}`;
      localStorage.setItem('siteflow_offline_user', JSON.stringify(safeUser));
      return { access_token: offlineToken, user: safeUser };
    } catch (e: any) {
      throw new Error(e.message || 'Registration failed.');
    }
  }

  // GET /auth/me
  if (endpoint === '/auth/me' && method === 'GET') {
    // Prefer the stored offline session if present
    try {
      const stored = localStorage.getItem('siteflow_offline_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      id: 'user-wrk-1',
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      role: 'worker',
      designation: 'Site Supervisor',
      department: 'Civil Construction'
    };
  }

  // GET /workers
  if ((endpoint === '/workers' || endpoint.includes('/workers')) && method === 'GET') {
    return [
      { id: 'user-wrk-1', name: 'Rajesh Kumar', email: 'worker@demo.com', role: 'worker' }
    ];
  }

  // GET /projects/:id/today-tasks
  if (endpoint.includes('/today-tasks') && method === 'GET') {
    return [];
  }

  // POST or PUT /daily-tasks/:id/update or /daily-tasks/:id
  if (endpoint.includes('/daily-tasks') && (method === 'POST' || method === 'PUT')) {
    const parts = endpoint.split('/');
    const taskId = parts[2] || 'task-1';
    return {
      id: taskId,
      project_id: 'proj-pune',
      l6_activity_id: 'l6-1',
      l5_name: 'PIER CONSTRUCTION',
      l6_name: 'PIER FORMWORK & CONCRETING',
      task_name: body.task_name || 'Concrete Pouring — Pier P1',
      planned_date: new Date().toISOString().split('T')[0],
      status: body.status || 'IN_PROGRESS',
      progress: body.progress !== undefined ? Number(body.progress) : 50.0,
      actual_start: body.actual_start || '09:00',
      actual_end: body.actual_end || '17:00',
      assigned_worker_id: 'user-wrk-1',
      assigned_worker_name: 'Rajesh Kumar',
      flagged_for_review: false,
      review_notes: body.notes || null
    };
  }

  // GET /history/benchmarks
  if (endpoint === '/history/benchmarks' && method === 'GET') {
    const stored = localStorage.getItem('siteflow_local_history_benchmarks');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return [
      {
        id: 'hist-1',
        project_category: 'Heavy Piping & Mechanical Infrastructure',
        activity_type: 'Spool Piping Erection & High-Pressure Tie-In',
        average_days: 5.2,
        baseline_days: 3.5,
        projects_analyzed_count: 6,
        top_delay_causes: ['Material delivery delay', 'Crane access priority clash', 'Hydro-testing rework'],
        ai_insight: 'Across 6 similar industrial piping projects, spool erection averaged 5.2 days vs 3.5 days baseline assumption. Main drivers were site crane schedule clashes and delayed flange shipments.'
      },
      {
        id: 'hist-2',
        project_category: 'Civil & Heavy Substructure',
        activity_type: 'Deep Foundation Bored Piling (18m-24m)',
        average_days: 2.8,
        baseline_days: 2.0,
        projects_analyzed_count: 8,
        top_delay_causes: ['Uncharted underground rock strata', 'Bentonite slurry recycling bottleneck', 'Heavy monsoon rain'],
        ai_insight: 'Bored piling execution averaged 2.8 days per pier vs 2.0 baseline. Soil resistance variability in hard rock strata caused 40% of overall foundation phase schedule slips.'
      },
      {
        id: 'hist-3',
        project_category: 'Structural Concrete & Superstructure',
        activity_type: 'Elevated Deck Slab Shuttering & Pouring',
        average_days: 4.1,
        baseline_days: 3.0,
        projects_analyzed_count: 5,
        top_delay_causes: ['Rebar binding sign-off delay', 'Concrete batching plant dispatch queue', 'Curing inspection delays'],
        ai_insight: 'Formwork and rebar inspection bottlenecks added an average of 1.1 days per slab pour cycle. Pre-checking rebar cages 24 hours in advance reduced approval friction by 65%.'
      },
      {
        id: 'hist-4',
        project_category: 'Electrical & Substation Installation',
        activity_type: 'HV Cable Trenching & Transformer Seating',
        average_days: 3.4,
        baseline_days: 3.0,
        projects_analyzed_count: 4,
        top_delay_causes: ['Right-of-way alignment clearances', 'Cable tray cable pulling friction'],
        ai_insight: 'High-voltage cabling tasks ran close to target (3.4 vs 3.0 days). Earthing grid sign-off delay was the single major path blocker.'
      }
    ];
  }

  // POST /history/benchmarks
  if (endpoint === '/history/benchmarks' && method === 'POST') {
    const existing = JSON.parse(localStorage.getItem('siteflow_local_history_benchmarks') || '[]');
    const newBenchmark = {
      id: `hist-${Date.now()}`,
      project_category: body.project_category || 'General Infrastructure',
      activity_type: body.activity_type || 'Execution Work Item',
      average_days: Number(body.average_days || 4.0),
      baseline_days: Number(body.baseline_days || 3.0),
      projects_analyzed_count: Number(body.projects_analyzed_count || 1),
      top_delay_causes: body.top_delay_causes || [],
      ai_insight: body.ai_insight || 'Logged retrospective benchmark.'
    };
    existing.unshift(newBenchmark);
    localStorage.setItem('siteflow_local_history_benchmarks', JSON.stringify(existing));
    return newBenchmark;
  }

  // GET /history/archived
  if (endpoint === '/history/archived' && method === 'GET') {
    return [
      {
        id: 'arch-proj-101',
        code: 'INF-2024-MUM',
        name: 'Metro Viaduct Line 4 Substructure',
        project_type: 'Transportation Infrastructure',
        client: 'Metropolitan Urban Transit Corp',
        location: 'Mumbai North Corridor',
        planned_duration_days: 240,
        actual_duration_days: 262,
        baseline_completion_date: '2024-11-15',
        actual_completion_date: '2024-12-07',
        spi_index: 0.92,
        overall_cost_variance: '+3.4% (Within Contingency)',
        status: 'Completed & Handed Over',
        key_lessons_learned: [
          'Early utility relocation prevented 18 days of potential pier drilling obstruction.',
          'Subcontractor rebar mobilization was slow during festive season Q3.'
        ],
        disciplines_count: 5
      },
      {
        id: 'arch-proj-102',
        code: 'REF-2025-GUJ',
        name: 'Jamnagar Refinery Storage Terminal Expansion',
        project_type: 'Petrochemical Heavy Industry',
        client: 'Reliance Petrochem Ltd',
        location: 'Jamnagar Industrial Zone',
        planned_duration_days: 180,
        actual_duration_days: 174,
        baseline_completion_date: '2025-05-30',
        actual_completion_date: '2025-05-24',
        spi_index: 1.03,
        overall_cost_variance: '-1.8% (Under Budget)',
        status: 'Completed & Handed Over',
        key_lessons_learned: [
          'Modular spool pre-fabrication offsite saved 14 days of field welding overhead.',
          'Smart daily progress photo verification accelerated milestone sign-off by 4 days per week.'
        ],
        disciplines_count: 6
      }
    ];
  }

  // GET /history/audit-logs
  if (endpoint === '/history/audit-logs' && method === 'GET') {
    return [
      {
        id: 'audit-1',
        user_id: 'user-emp-1',
        user_name: 'Aditi Patil',
        action: 'PROJECT_EXECUTION_PLAN_CONFIRMED',
        target_entity: 'Project',
        target_id: 'proj-pune',
        details: 'Execution plan for Pune Metro Elevated Viaduct confirmed by Aditi Patil.',
        timestamp: '2026-09-09 18:30:00'
      },
      {
        id: 'audit-2',
        user_id: 'user-sup-1',
        user_name: 'Rahul Sharma',
        action: 'DAILY_PROGRESS_REPORT_VERIFIED',
        target_entity: 'DailyReport',
        target_id: 'rpt-101',
        details: 'Verified 100% completion for Pier P1 Pile Boring report with visual proof.',
        timestamp: '2026-09-09 16:45:00'
      },
      {
        id: 'audit-3',
        user_id: 'user-emp-1',
        user_name: 'Aditi Patil',
        action: 'AI_VISION_ANALYSIS_COMPLETED',
        target_entity: 'SiteImage',
        target_id: 'img-202',
        details: 'Roboflow Vision model detected 4x Rebar & 2x Formwork elements with 94.5% confidence.',
        timestamp: '2026-09-09 14:15:00'
      }
    ];
  }

  // POST /history/query
  if (endpoint === '/history/query' && method === 'POST') {
    const q = (body.query || '').toLowerCase();
    const benchmarks = [
      {
        id: 'hist-1',
        category: 'Heavy Piping & Mechanical Infrastructure',
        activity_type: 'Spool Piping Erection & High-Pressure Tie-In',
        insight: 'Across 6 similar industrial piping projects, spool erection averaged 5.2 days vs 3.5 days baseline assumption. Main drivers were site crane schedule clashes and delayed flange shipments.',
        relevance_score: 0.94,
        baseline_days: 3.5,
        average_days: 5.2,
        delay_variance_pct: 48.6,
        top_delay_causes: ['Material delivery delay', 'Crane access priority clash', 'Hydro-testing rework']
      },
      {
        id: 'hist-2',
        category: 'Civil & Heavy Substructure',
        activity_type: 'Deep Foundation Bored Piling (18m-24m)',
        insight: 'Bored piling execution averaged 2.8 days per pier vs 2.0 baseline. Soil resistance variability in hard rock strata caused 40% of overall foundation phase schedule slips.',
        relevance_score: 0.88,
        baseline_days: 2.0,
        average_days: 2.8,
        delay_variance_pct: 40.0,
        top_delay_causes: ['Uncharted underground rock strata', 'Bentonite slurry recycling bottleneck', 'Heavy monsoon rain']
      }
    ];

    return {
      query: body.query,
      results_count: benchmarks.length,
      synthesized_summary: `Synthesized historical memory search for '${body.query}': Analyzed past project execution benchmarks. Primary delay factors identified include crane allocation conflicts and material delivery lead times.`,
      items: benchmarks
    };
  }

  return undefined;
}

export async function fetchAPI<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = 'API Request Failed';
      try {
        const errRes = await response.json();
        errorDetail = errRes.detail || errRes.message || errorDetail;
      } catch (e) {
        // ignore parse error
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();

    // Cache successful project list responses to localStorage for offline fallback
    if (endpoint === '/projects' && (options.method || 'GET').toUpperCase() === 'GET' && Array.isArray(data) && data.length > 0) {
      saveLocalProjectsStore(data);
    }

    return data;
  } catch (err: any) {
    const method = (options.method || 'GET').toUpperCase();
    // Only treat genuine network/connection failures as offline (not backend 4xx/5xx errors)
    const isNetworkError = err.name === 'TypeError' || err.message === 'Failed to fetch' || err.message?.includes('NetworkError');
    
    // For POST /site-images: never fall back to static mock on backend errors —
    // doing so would discard the real AI analysis result from the server.
    // Only fall back on true offline / unreachable-server failures.
    if (isNetworkError) {
      console.warn(`[API Fallback] ${method} ${API_BASE_URL}${endpoint}: ${err.message}. Using offline data.`);
      const fallbackResult = handleOfflineFallback(endpoint, options);
      if (fallbackResult !== undefined) {
        return fallbackResult as T;
      }
    } else if (method === 'GET' && err.message?.includes('Not authenticated')) {
      console.warn(`[API Fallback] ${method} ${API_BASE_URL}${endpoint}: ${err.message}. Using offline data.`);
      const fallbackResult = handleOfflineFallback(endpoint, options);
      if (fallbackResult !== undefined) {
        return fallbackResult as T;
      }
    }
    throw err;
  }
}

export const api = {
  // Auth
  register: (data: any) => fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchAPI('/auth/me'),

  // Projects
  getProjects: () => fetchAPI('/projects'),
  getProjectById: (id: string) => fetchAPI(`/projects/${id}`),
  createProject: (data: any) => fetchAPI('/projects', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id: string) => fetchAPI(`/projects/${id}`, { method: 'DELETE' }),
  previewProjectCode: (accessCode: string) => fetchAPI('/projects/preview-code', { method: 'POST', body: JSON.stringify({ access_code: accessCode }) }),
  joinProject: (accessCode: string) => fetchAPI('/projects/join', { method: 'POST', body: JSON.stringify({ access_code: accessCode }) }),
  regenerateProjectCode: (projectId: string) => fetchAPI(`/projects/${projectId}/regenerate-code`, { method: 'POST' }),
  getProjectMembers: (projectId: string) => fetchAPI(`/projects/${projectId}/members`),

  // Supervisors & Organizational Hierarchy
  getAvailableSupervisors: () => fetchAPI('/projects/supervisors/available'),
  getProjectSupervisors: (projectId: string) => fetchAPI(`/projects/${projectId}/supervisors`),
  assignSupervisor: (projectId: string, data: { supervisor_id: string; discipline: string }) => fetchAPI(`/projects/${projectId}/supervisors`, { method: 'POST', body: JSON.stringify(data) }),

  // Workers & Assignments
  getWorkers: () => fetchAPI('/workers'),
  getProjectWorkers: (projectId: string) => fetchAPI(`/projects/${projectId}/workers`),
  assignWorker: (projectId: string, data: any) => fetchAPI(`/projects/${projectId}/workers`, { method: 'POST', body: JSON.stringify(data) }),

  // Activities & Schedule Upload
  getProjectActivities: (projectId: string) => fetchAPI(`/projects/${projectId}/activities`),
  createActivity: (projectId: string, data: any) => fetchAPI(`/projects/${projectId}/activities`, { method: 'POST', body: JSON.stringify(data) }),
  uploadScheduleActivities: (projectId: string, activities: any[]) => fetchAPI(`/projects/${projectId}/activities/upload`, { method: 'POST', body: JSON.stringify(activities) }),
  uploadProjectSchedule: (projectId: string, _file: File) => fetchAPI(`/projects/${projectId}/activities/upload`, { method: 'POST', body: JSON.stringify([]) }),
  assignActivityToWorker: (projectId: string, activityId: string, workerId: string) => fetchAPI(`/projects/${projectId}/activities/${activityId}/assign`, { method: 'POST', body: JSON.stringify({ worker_id: workerId }) }),

  // Daily Progress & Intelligence Pipeline
  submitProgress: (data: any) => fetchAPI('/progress', { method: 'POST', body: JSON.stringify(data) }),
  submitTextReport: (data: { project_id: string; raw_text: string }) => fetchAPI('/progress/text', { method: 'POST', body: JSON.stringify(data) }),
  submitVoiceReport: (data: { project_id: string; audio_base64?: string; transcript?: string }) => fetchAPI('/progress/voice', { method: 'POST', body: JSON.stringify(data) }),
  getProjectProgressReports: (projectId: string) => fetchAPI(`/projects/${projectId}/progress`),
  getConsolidatedProgress: (projectId: string) => fetchAPI(`/projects/${projectId}/consolidated-progress`),
  getProjectProgressEvents: (projectId: string, statusFilter?: string) => fetchAPI(`/projects/${projectId}/progress-events${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
  confirmMatch: (eventId: string, data: any) => fetchAPI(`/progress-events/${eventId}/confirm`, { method: 'POST', body: JSON.stringify(data) }),
  getEventAuditTrail: (eventId: string) => fetchAPI(`/progress-events/${eventId}/audit`),

  // Automated Execution Plan & Day-wise Tasks
  generatePlan: (projectId: string) => fetchAPI(`/projects/${projectId}/generate-plan`, { method: 'POST' }),
  getExecutionPlan: (projectId: string) => fetchAPI(`/projects/${projectId}/execution-plan`),
  getProjectPlan: (projectId: string) => fetchAPI(`/projects/${projectId}/execution-plan`),
  confirmPlan: (projectId: string, notes?: string) => fetchAPI(`/projects/${projectId}/confirm-plan`, { method: 'POST', body: JSON.stringify({ notes }) }),
  getTodayTasks: (projectId: string, date?: string) => fetchAPI(`/projects/${projectId}/today-tasks${date ? `?date=${date}` : ''}`),
  updateDailyTask: (taskId: string, data: any) => fetchAPI(`/daily-tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateTaskProgress: (taskId: string, data: any) => fetchAPI(`/daily-tasks/${taskId}/update`, { method: 'POST', body: JSON.stringify(data) }),

  // Site Images
  uploadSiteImage: (data: any) => fetchAPI('/site-images', { method: 'POST', body: JSON.stringify(data) }),
  getProjectSiteImages: (projectId: string) => fetchAPI(`/projects/${projectId}/site-images`),
  analyzeImageById: (imageId: string) => fetchAPI(`/site-images/${imageId}/analyze`, { method: 'POST' }),
  analyzeImageUrl: (imageUrl: string) => fetchAPI('/site-images/analyze-roboflow', { method: 'POST', body: JSON.stringify({ image_path_or_url: imageUrl }) }),

  // Notifications
  getNotifications: () => fetchAPI('/notifications'),
  markNotificationRead: (id: string) => fetchAPI(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => fetchAPI('/notifications/read-all', { method: 'PUT' }),

  // Project History & Institutional Memory
  getHistoryBenchmarks: () => fetchAPI('/history/benchmarks'),
  addHistoryBenchmark: (data: any) => fetchAPI('/history/benchmarks', { method: 'POST', body: JSON.stringify(data) }),
  getArchivedProjects: () => fetchAPI('/history/archived'),
  getAuditLogs: () => fetchAPI('/history/audit-logs'),
  queryProjectMemory: (query: string) => fetchAPI('/history/query', { method: 'POST', body: JSON.stringify({ query }) }),
};

