import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  FolderKanban,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function OverviewDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activities, setActivities] = useState<any[]>([]);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [consolidatedProgress, setConsolidatedProgress] = useState<any>(null);
  const [progressEvents, setProgressEvents] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = async (isPoll = false, overrideProjectId?: string) => {
    if (!isPoll) setLoading(true);
    try {
      const projList = await api.getProjects();
      setProjects(projList || []);

      if (projList && projList.length > 0) {
        const storedActiveId = localStorage.getItem('siteflow_active_project_id');
        const targetId = overrideProjectId || storedActiveId || selectedProjectId || projList[0].id;
        const activeProj = projList.find((p: any) => p.id === targetId || p.code === targetId) || projList[0];
        setSelectedProject(activeProj);
        setSelectedProjectId(activeProj.id);
        localStorage.setItem('siteflow_active_project_id', activeProj.id);

        const actList = await api.getProjectActivities(activeProj.id);
        setActivities(actList || []);

        const plan = await api.getProjectPlan(activeProj.id);
        setDailyTasks(plan?.day_wise_tasks || []);

        try {
          const consolidated = await api.getConsolidatedProgress(activeProj.id);
          setConsolidatedProgress(consolidated);
        } catch (e) {
          console.error(e);
        }

        // Also fetch progress events (text/voice/image reports from workers)
        try {
          const events = await api.getProjectProgressEvents(activeProj.id);
          setProgressEvents(events || []);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleProjectChanged = (e: any) => {
      if (e.detail) {
        handleProjectChange(e.detail);
      }
    };
    window.addEventListener('siteflow_project_changed', handleProjectChanged);

    // 5-second auto-polling interval for live Worker -> Employer progress sync
    const timer = setInterval(() => {
      loadDashboardData(true);
    }, 5000);

    return () => {
      window.removeEventListener('siteflow_project_changed', handleProjectChanged);
      clearInterval(timer);
    };
  }, [selectedProjectId]); // Re-run when project changes

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData(true);
    setIsRefreshing(false);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('siteflow_active_project_id', projectId);
    loadDashboardData(false, projectId);
  };

  const employerName = user?.name || 'Employer';

  if (loading) {
    return <LoadingState message="Loading dashboard metrics from database..." />;
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${employerName}`}
          subtitle="No projects created yet."
        />

        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first construction project to start tracking L5/L6 activities and project progress."
          action={
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => navigate('/employer/projects')}
            >
              Create New Project
            </Button>
          }
        />
      </div>
    );
  }

  const completedTasks = dailyTasks.filter(t => t.status === 'COMPLETED' || t.progress >= 100).length;
  const inProgressTasks = dailyTasks.filter(t => t.status === 'IN_PROGRESS' || (t.progress > 0 && t.progress < 100)).length;
  const delayedTasks = consolidatedProgress?.delayed_tasks_count ?? dailyTasks.filter(t => t.status === 'DELAYED').length;
  const blockedTasks = consolidatedProgress?.blocked_tasks_count ?? dailyTasks.filter(t => t.status === 'BLOCKED').length;

  const totalTasksCount = dailyTasks.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = dailyTasks.filter(t => t.planned_date === todayStr);

  const overallProgress = consolidatedProgress?.overall_progress !== undefined && consolidatedProgress?.overall_progress !== null
    ? consolidatedProgress.overall_progress
    : (selectedProject?.actual_progress || 0);

  const todayProgress = consolidatedProgress?.today_progress !== undefined && consolidatedProgress?.today_progress !== null
    ? consolidatedProgress.today_progress
    : (todayTasks.length > 0 ? Math.round((todayTasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0) / todayTasks.length) * 10) / 10 : 0);

  const reportingWorkers = consolidatedProgress?.workers_reporting_count || 0;
  const totalWorkers = consolidatedProgress?.total_workers_count || 1;
  const workerUpdates = consolidatedProgress?.worker_updates || [];

  // Merge task-based updates with voice/text/image progress events into one unified feed
  const taskFeedItems = workerUpdates.map((u: any) => ({
    id: `task-${u.id}`,
    worker_name: u.worker_name,
    worker_email: u.worker_email,
    title: u.task_name,
    subtitle: u.l6_name,
    remarks: u.remarks,
    status: u.status,
    progress: u.percent_complete,
    timestamp: u.updated_at,
    source: 'TASK',
  }));

  const eventFeedItems = progressEvents.slice(0, 20).map((ev: any) => ({
    id: `ev-${ev.id}`,
    worker_name: ev.worker_name || 'Worker',
    worker_email: '',
    title: ev.activity_name || ev.raw_input?.substring(0, 60) || 'Field Report',
    subtitle: ev.l5_name || ev.activity_code || '',
    remarks: ev.raw_input || '',
    status: ev.status,
    progress: ev.extracted_progress ?? null,
    timestamp: ev.created_at,
    source: ev.source_type || 'TEXT',
  }));

  // Combine and sort by most recent first
  const allFeedItems = [...taskFeedItems, ...eventFeedItems].sort((a, b) =>
    (b.timestamp || '').localeCompare(a.timestamp || '')
  ).slice(0, 25);

  const l5Packages = activities.filter(a => a.wbs_level === 'L5');

  const sourceColors: Record<string, string> = {
    VOICE: 'bg-purple-100 text-purple-700 border-purple-200',
    TEXT: 'bg-blue-100 text-blue-700 border-blue-200',
    IMAGE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    TASK: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const sourceIcons: Record<string, string> = {
    VOICE: '🎙️',
    TEXT: '📝',
    IMAGE: '📷',
    TASK: '✅',
  };

  return (
    <div className="space-y-8 font-sans text-slate-800 pb-12">
      {/* Dashboard Header */}
      <PageHeader
        title="Project Overview"
        subtitle={`Real-time execution status and live progress sync for ${selectedProject?.name || ''} (${selectedProject?.code || ''}).`}
        action={
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            {/* Project Switcher */}
            {projects.length > 1 && (
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-2xs"
              >
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={handleManualRefresh}
              isLoading={isRefreshing}
            >
              Live Sync
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/employer/projects/${selectedProject?.id}/execution-plan`)}
            >
              Execution Plan Review
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/employer/projects')}
            >
              Create New Project
            </Button>
          </div>
        }
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
            <span>Overall Field Progress</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{overallProgress}%</span>
            <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Planned: {selectedProject?.baseline_progress || 100}%
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] flex justify-between font-semibold">
            <span className="text-slate-500">Schedule Status:</span>
            <span className={(overallProgress - (selectedProject?.baseline_progress || 0)) >= 0 ? 'text-emerald-600 font-bold' : 'text-orange-600 font-bold'}>
              {(overallProgress - (selectedProject?.baseline_progress || 0)) >= 0 ? 'On Track' : `${((selectedProject?.baseline_progress || 0) - overallProgress).toFixed(1)}% Delay Risk`}
            </span>
          </div>
        </Card>

        <Card className="shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
            <span>Today's Progress & Workers</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{todayProgress}%</span>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
              {reportingWorkers} / {totalWorkers} Reporting
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between font-semibold">
            <span className="text-emerald-600">{completedTasks} Completed</span>
            <span className="text-blue-600">{inProgressTasks} In Progress</span>
          </div>
        </Card>

        <Card className="shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
            <span>Delayed Tasks</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-red-600">{delayedTasks}</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Requires schedule mitigation
          </div>
        </Card>

        <Card className="shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
            <span>Blocked Tasks</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-orange-600">{blockedTasks}</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Pending material or access clearances
          </div>
        </Card>
      </div>


      {/* WORKER UPDATES LIVE FEED SECTION */}
      <Card className="space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Worker Field Updates Feed</h3>
            <p className="text-xs text-slate-500 font-medium">
              Live progress from task updates, voice reports, text reports, and site image submissions.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Auto-Sync 5s</span>
          </span>
        </div>

        {allFeedItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">No worker progress submitted yet.</p>
            <p className="text-slate-400">Worker updates via tasks, voice, text or image will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {allFeedItems.map((item: any) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sourceColors[item.source] || sourceColors.TEXT}`}>
                      {sourceIcons[item.source] || '📝'} {item.source}
                    </span>
                    <span className="font-bold text-slate-900">{item.worker_name}</span>
                    {item.worker_email && (
                      <span className="text-[10px] text-slate-400 font-mono">({item.worker_email})</span>
                    )}
                  </div>
                  <div className="text-slate-700 font-semibold">
                    {item.title}
                    {item.subtitle && (
                      <span className="text-blue-600 font-mono"> • {item.subtitle}</span>
                    )}
                  </div>
                  {item.remarks && (
                    <p className="text-slate-500 italic text-[11px] max-w-lg truncate">"{item.remarks}"</p>
                  )}
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <Badge
                    variant={
                      item.status === 'COMPLETED' || item.status === 'Automatically Matched' ? 'success'
                      : item.status === 'BLOCKED' || item.status === 'Rejected' ? 'danger'
                      : item.status === 'DELAYED' ? 'danger'
                      : 'warning'
                    }
                    size="sm"
                  >
                    {item.status}
                  </Badge>
                  {item.progress !== null && item.progress !== undefined && (
                    <span className="font-extrabold text-blue-600 text-sm">{item.progress}%</span>
                  )}
                  <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* L5 Package Progress Section */}
      {l5Packages.length > 0 && (
        <Card className="space-y-4 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900">L5 Work Package Progress</h3>
          <div className="space-y-3">
            {l5Packages.map((pkg) => (
              <div key={pkg.id} className="space-y-1 text-xs font-semibold">
                <div className="flex justify-between text-slate-800">
                  <span>{pkg.name}</span>
                  <span className="text-blue-600 font-bold">{pkg.actual_progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(pkg.actual_progress, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* L5/L6 Activity Status Table */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-2xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
          <span>L5/L6 Activity Execution Status</span>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/employer/projects/${selectedProject?.id}`)}>
            View Project Details →
          </Button>
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            No schedule activities generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px]">
                  <th className="py-3 px-4">Activity ID</th>
                  <th className="py-3 px-4">L5 Package</th>
                  <th className="py-3 px-4">L6 Line Item</th>
                  <th className="py-3 px-4">Planned %</th>
                  <th className="py-3 px-4">Actual %</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((act) => (
                  <tr
                    key={act.id}
                    onClick={() => navigate(`/employer/projects/${selectedProject?.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{act.activity_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">{act.l5_name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{act.name}</td>
                    <td className="py-3 px-4 text-slate-600">{act.planned_progress}%</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{act.actual_progress}%</td>
                    <td className="py-3 px-4">
                      <Badge variant={act.status === 'Delayed' ? 'danger' : act.status === 'At Risk' ? 'warning' : 'success'} size="sm">
                        {act.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
