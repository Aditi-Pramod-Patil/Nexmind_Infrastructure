import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { JoinProjectModal } from '../../components/worker/JoinProjectModal';
import { PlannedVsActualBoxGraph } from '../../components/worker/PlannedVsActualBoxGraph';
import {
  MapPin,
  Plus,
  ArrowRight,
  KeyRound,
  FolderKanban,
  CheckCircle2,
  TrendingUp,
  Mic,
  Calendar,
  Layers,
  Edit3,
  Play,
  X,
  ListTodo
} from 'lucide-react';
import { formatTaskForDisplay } from '../../utils/taskFormatter';

export function WorkerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [joinedProjects, setJoinedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Daily Tasks Line Se State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Task Update Modal State
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskStatus, setTaskStatus] = useState('IN_PROGRESS');
  const [taskProgress, setTaskProgress] = useState(0);
  const [updateNotes, setUpdateNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadTodayTasks = async (projId: string) => {
    if (!projId) return;
    setTasksLoading(true);
    try {
      const tasks = await api.getTodayTasks(projId);
      setTodayTasks(tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadWorkerProjects = async () => {
    setLoading(true);
    try {
      const projs = await api.getProjects();
      setJoinedProjects(projs || []);
      if (projs && projs.length > 0) {
        const storedActiveId = localStorage.getItem('siteflow_active_project_id');
        const activeProjId = projs.find((p: any) => p.id === storedActiveId)?.id || projs[0].id;
        setSelectedProjectId(activeProjId);
        loadTodayTasks(activeProjId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkerProjects();
  }, []);

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    localStorage.setItem('siteflow_active_project_id', projId);
    loadTodayTasks(projId);
  };

  const handleQuickStartWork = async (task: any) => {
    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      await api.updateTaskProgress(task.id, {
        status: 'IN_PROGRESS',
        progress: Math.max(task.progress || 0, 10),
        actual_start: nowTime,
        notes: `Started work at ${nowTime}`
      });
      loadTodayTasks(selectedProjectId);
      loadWorkerProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to start work.');
    }
  };

  const handleOpenUpdateModal = (task: any) => {
    setSelectedTask(task);
    setTaskStatus(task.status || 'IN_PROGRESS');
    setTaskProgress(Number(task.progress || 0));
    setUpdateNotes(task.review_notes || '');
    setUpdateModalOpen(true);
  };

  const handleTaskUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setUpdating(true);
    try {
      await api.updateTaskProgress(selectedTask.id, {
        status: taskStatus,
        progress: Number(taskProgress),
        notes: updateNotes
      });
      setUpdateModalOpen(false);
      loadTodayTasks(selectedProjectId);
      loadWorkerProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to update task.');
    } finally {
      setUpdating(false);
    }
  };

  const workerName = user?.name || 'Worker';
  const totalProjects = joinedProjects.length;
  const activeProjectsCount = joinedProjects.filter(p => p.status !== 'Completed').length;
  const avgProgress = totalProjects > 0
    ? Math.round(joinedProjects.reduce((acc, p) => acc + (Number(p.actual_progress) || 0), 0) / totalProjects)
    : 0;

  const completedTasksCount = todayTasks.filter(t => t.status === 'COMPLETED' || t.progress >= 100).length;

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Header */}
      <PageHeader
        title={`Welcome, ${workerName}`}
        subtitle="Real-time field execution workspace, sequential daily task queue, and site progress logging."
        action={
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Mic}
              onClick={() => navigate('/worker/report')}
            >
              Report Progress
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setJoinModalOpen(true)}
            >
              Join Project
            </Button>
          </div>
        }
      />

      {/* Quick Field Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Joined Projects</span>
            <FolderKanban className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalProjects}</span>
            <span className="text-xs text-slate-500 font-semibold">({activeProjectsCount} Active)</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Avg Field Progress</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600">{avgProgress}%</span>
            <span className="text-xs text-slate-500 font-semibold">Across all sites</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Today's Task Queue</span>
            <ListTodo className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-blue-600">
              {completedTasksCount} / {todayTasks.length}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Done Today</span>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: TODAY'S EXECUTABLE DAILY TASKS (LINE SE)      */}
      {/* ======================================================== */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Today's Daily Tasks (Line Se / Sequential Execution)
              </h3>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {todayTasks.length} Tasks
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Chronological day-wise task execution sequence for {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.
            </p>
          </div>

          {joinedProjects.length > 1 && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="text-xs text-slate-500 font-bold">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-2xs cursor-pointer"
              >
                {joinedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {tasksLoading ? (
          <LoadingState message="Loading today's sequential task queue..." />
        ) : todayTasks.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-300 bg-white space-y-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto opacity-80" />
            <h4 className="font-extrabold text-slate-800 text-sm">No Pending Tasks Assigned For Today</h4>
            <p className="text-slate-500 max-w-sm mx-auto">
              All daily tasks for this project are up to date, or the execution plan is awaiting new daily assignments.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayTasks.map((t, index) => {
              const formatted = formatTaskForDisplay(t);
              const isNotStarted = t.status === 'NOT_STARTED';
              const isCompleted = t.status === 'COMPLETED' || t.progress >= 100;
              const actualProgress = Number(t.progress || 0);

              return (
                <Card
                  key={t.id}
                  className={`p-4 border bg-white rounded-2xl transition-all hover:shadow-xs ${
                    isCompleted
                      ? 'border-emerald-200/90 bg-emerald-50/15'
                      : t.status === 'IN_PROGRESS'
                      ? 'border-blue-200 bg-blue-50/10'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Sequence Number & Task Info */}
                    <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-2xs ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Layers className="w-3 h-3 mr-1" />
                            {formatted.cleanPackageName}
                          </span>

                          {t.planned_date && (
                            <span className="inline-flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                              {t.planned_date}
                            </span>
                          )}

                          <Badge
                            variant={
                              isCompleted
                                ? 'success'
                                : t.status === 'IN_PROGRESS'
                                ? 'warning'
                                : t.status === 'DELAYED' || t.status === 'BLOCKED'
                                ? 'danger'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {isNotStarted ? 'NOT STARTED' : t.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                          {formatted.displayTitle}
                        </h4>

                        {formatted.fullSummary && (
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {formatted.fullSummary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Progress Bar */}
                    <div className="w-full lg:w-44 space-y-1 flex-shrink-0">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Progress</span>
                        <span className={actualProgress >= 100 ? 'text-emerald-600' : 'text-blue-600'}>
                          {actualProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, actualProgress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {isNotStarted && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Play}
                          onClick={() => handleQuickStartWork(t)}
                        >
                          Start
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Edit3}
                        onClick={() => handleOpenUpdateModal(t)}
                      >
                        Update
                      </Button>
                      <button
                        onClick={() => navigate(`/worker/projects/${selectedProjectId}`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View in Project Detail"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: MY ACTIVE CONSTRUCTION PROJECTS               */}
      {/* ======================================================== */}
      <div className="pt-6 space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            My Active Construction Projects
          </h3>
          <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {joinedProjects.length} Projects Available
          </span>
        </div>

        {loading ? (
          <LoadingState message="Loading joined projects from database..." />
        ) : joinedProjects.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No projects joined yet"
            description="Enter the project access code provided by your employer to access site activities and submit progress reports."
            action={
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => setJoinModalOpen(true)}
              >
                Join Project with Access Code
              </Button>
            }
          />
        ) : (
          <div className={`grid grid-cols-1 ${joinedProjects.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
            {joinedProjects.map((proj) => (
              <Card
                key={proj.id}
                hoverable
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  navigate(`/worker/projects/${proj.id}`);
                }}
                className="p-5 space-y-4 border border-slate-200 bg-white shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                        {proj.code}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1.5">{proj.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{proj.location} • Client: {proj.client}</span>
                      </p>
                    </div>
                    <Badge variant={proj.status === 'Completed' ? 'success' : proj.status === 'Delayed' ? 'danger' : 'warning'} size="sm">
                      {proj.status}
                    </Badge>
                  </div>

                  {/* Planned vs Actual Progress Box Graph Component */}
                  <PlannedVsActualBoxGraph
                    baselineProgress={proj.baseline_progress || 100}
                    actualProgress={proj.actual_progress || 0}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-blue-600 font-extrabold pt-2 border-t border-slate-100">
                  <span>View Assigned Tasks & Submit Progress</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Update Progress Modal */}
      {updateModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Update Task Progress</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{selectedTask.task_name}</p>
              </div>
              <button
                onClick={() => setUpdateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTaskUpdateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Execution Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-700">Progress Percentage</span>
                  <span className="text-blue-600 font-extrabold">{taskProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={taskProgress}
                  onChange={(e) => setTaskProgress(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Field Remarks / Daily Notes</label>
                <textarea
                  rows={3}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="e.g. Rebar installation completed for Pier P2. Shuttering aligned for pour."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUpdateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={updating}
                >
                  Save Progress
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Project Modal */}
      <JoinProjectModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onProjectJoined={(projectId) => {
          loadWorkerProjects();
          navigate(`/worker/projects/${projectId}`);
        }}
      />
    </div>
  );
}
