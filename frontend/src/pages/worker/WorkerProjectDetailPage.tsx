import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { PlannedVsActualBoxGraph } from '../../components/worker/PlannedVsActualBoxGraph';
import { ArrowLeft, MapPin, Camera, Mic, CheckCircle2, Layers, Loader2, AlertCircle, Calendar, Clock, Play, ListChecks, TrendingUp } from 'lucide-react';
import { formatTaskForDisplay } from '../../utils/taskFormatter';

export function WorkerProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update Task Modal State
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskStatus, setTaskStatus] = useState('IN_PROGRESS');
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [actualStart, setActualStart] = useState('09:00');
  const [actualEnd, setActualEnd] = useState('17:00');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Image Upload Modal State
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80');
  const [imageDesc, setImageDesc] = useState('Task execution site photo');
  const [imageSubmitting, setImageSubmitting] = useState(false);
  const [imageSuccess, setImageSuccess] = useState(false);

  const fetchWorkerProjectData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const proj = await api.getProjectById(id);
      setProject(proj);

      const tasks = await api.getTodayTasks(id);
      setTodayTasks(tasks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerProjectData();
  }, [id]);

  const handleStartWork = async (task: any) => {
    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      await api.updateTaskProgress(task.id, {
        status: 'IN_PROGRESS',
        progress: Math.max(task.progress, 10),
        actual_start: nowTime,
        notes: `Started work at ${nowTime}`
      });
      window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: id }));
      fetchWorkerProjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to start work.');
    }
  };

  const handleTaskUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setUpdating(true);
    try {
      await api.updateTaskProgress(selectedTask.id, {
        status: taskStatus,
        progress: Number(taskProgress),
        actual_start: actualStart,
        actual_end: actualEnd,
        notes: updateNotes
      });

      setUpdateModalOpen(false);
      window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: id }));
      fetchWorkerProjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !targetTaskId) return;

    setImageSubmitting(true);
    try {
      await api.uploadSiteImage({
        project_id: id,
        daily_task_id: targetTaskId,
        image_url: imageUrl,
        description: imageDesc
      });

      setImageSuccess(true);
      setTimeout(() => {
        setImageSuccess(false);
        setImageModalOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to upload image.');
    } finally {
      setImageSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span>Loading project details...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/worker/dashboard')} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Projects</span>
        </button>
        <Card className="p-6 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
          {error || 'Project not found.'}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-slate-800 pb-10">
      <button onClick={() => navigate('/worker/dashboard')} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Projects</span>
      </button>

      {/* Project Banner */}
      <Card className="p-4 space-y-2 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            {project.code}
          </span>
          <Badge variant={project.status === 'Completed' ? 'success' : 'warning'} size="sm">
            {project.status}
          </Badge>
        </div>

        <h3 className="text-base font-extrabold text-[#0F172A]">{project.name}</h3>
        <p className="text-xs text-slate-500 flex items-center space-x-1 font-medium">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{project.location} • Client: {project.client}</span>
        </p>
      </Card>

      {/* Planned vs Actual Field Progress Box Graph */}
      <PlannedVsActualBoxGraph
        baselineProgress={project.baseline_progress || 100}
        actualProgress={project.actual_progress || 0}
      />

      {/* TODAY'S EXECUTABLE TASKS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
            TODAY'S TASKS ({todayTasks.length})
          </h4>
          <span className="text-[11px] text-blue-600 font-bold">
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {todayTasks.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-300">
            No executable tasks assigned for today.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayTasks.map((t) => {
              const formatted = formatTaskForDisplay(t);
              const isNotStarted = t.status === 'NOT_STARTED';
              const isCompleted = t.status === 'COMPLETED';
              const targetProgress = t.planned_progress || 100;
              const actualProgress = Number(t.progress || 0);
              const isBehind = !isNotStarted && !isCompleted && actualProgress < targetProgress;

              return (
                <Card
                  key={t.id}
                  className="p-5 border border-slate-200 bg-white rounded-2xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  {/* 1. Header Classification Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                          <Layers className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          {formatted.cleanPackageName}
                        </span>
                        {formatted.subPackageName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {formatted.subPackageName}
                          </span>
                        )}
                        {formatted.stageBadge && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {formatted.stageBadge}
                          </span>
                        )}
                      </div>

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

                    {/* 2. Main Title */}
                    <div>
                      <h5 className="text-base font-extrabold text-slate-900 leading-snug tracking-tight">
                        {formatted.displayTitle}
                      </h5>
                      {formatted.fullSummary && (
                        <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                          {formatted.fullSummary}
                        </p>
                      )}
                    </div>

                    {/* 3. Structured Scope / Deliverables List (if multiple items) */}
                    {formatted.scopeItems.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          <ListChecks className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          <span>Execution Scope & Work Items ({formatted.scopeItems.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {formatted.scopeItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-[11px] font-semibold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-2xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 flex-shrink-0" />
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Scheduling & Shift Metadata Row */}
                    <div className="flex items-center flex-wrap gap-y-1 gap-x-3 text-[11px] font-medium text-slate-500">
                      <span className="inline-flex items-center text-slate-700 font-semibold">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        Planned: {t.planned_date}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Shift: {t.actual_start || '09:00'} - {t.actual_end || '17:00'}
                      </span>
                    </div>
                  </div>

                  {/* 5. Schedule & Execution Performance Box */}
                  <div className="space-y-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                        Schedule Execution
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : isNotStarted
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isBehind
                            ? 'bg-orange-100 text-orange-800 border-orange-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {isCompleted
                          ? 'Completed'
                          : isNotStarted
                          ? 'Scheduled for Today'
                          : isBehind
                          ? `${(targetProgress - actualProgress).toFixed(0)}% Behind Schedule`
                          : 'On Schedule'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-0.5">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">Planned Target</span>
                        <span className="text-slate-900 font-extrabold text-sm">{targetProgress}%</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">Actual Progress</span>
                        <span className={`font-extrabold text-sm ${actualProgress > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {actualProgress}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(Math.max(actualProgress, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {isNotStarted ? (
                      <button
                        onClick={() => handleStartWork(t)}
                        className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Work</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedTask(t);
                          setTaskStatus(t.status);
                          setTaskProgress(t.progress);
                          setActualStart(t.actual_start || '09:00');
                          setActualEnd(t.actual_end || '17:00');
                          setUpdateNotes('');
                          setUpdateModalOpen(true);
                        }}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Update Progress</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setTargetTaskId(t.id);
                        setImageModalOpen(true);
                      }}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-200"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Upload Image</span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Update Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Update Daily Task Progress"
        subtitle={selectedTask?.task_name}
        maxWidth="md"
      >
        <form onSubmit={handleTaskUpdateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Status</label>
            <select
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
            >
              <option value="NOT_STARTED">NOT STARTED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DELAYED">DELAYED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Progress Percentage ({taskProgress}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={taskProgress}
              onChange={(e) => setTaskProgress(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Actual Start Time</label>
              <input
                type="time"
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Actual End Time</label>
              <input
                type="time"
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Field Update / Voice Notes</label>
            <textarea
              rows={2}
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="e.g., Completed location marking from 9 AM to 4 PM..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button type="button" onClick={() => setUpdateModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={updating} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs">
              {updating ? 'Saving...' : 'Submit Update'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Site Image Modal */}
      <Modal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title="Upload Site Image"
        subtitle={`Project: ${project.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleUploadImageSubmit} className="space-y-4 text-xs">
          {imageSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Image Uploaded & Stored against Day-Wise Task!</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select / Capture Site Photo *</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center bg-slate-50 transition-colors">
                  {imageUrl ? (
                    <div className="relative rounded-lg overflow-hidden max-h-44 bg-slate-950 mb-2.5 border border-slate-200">
                      <img src={imageUrl} alt="Uploaded site preview" className="w-full h-full object-cover max-h-44 mx-auto" />
                    </div>
                  ) : (
                    <div className="py-4 text-slate-500 font-semibold space-y-1">
                      <Camera className="w-8 h-8 text-emerald-600 mx-auto" />
                      <div>Tap to pick photo or capture from camera</div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (reader.result) {
                            setImageUrl(reader.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="modal-worker-image-file-input"
                  />
                  <label
                    htmlFor="modal-worker-image-file-input"
                    className="inline-block px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-2xs transition-colors"
                  >
                    {imageUrl ? 'Change Photo File' : 'Choose / Capture Photo'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Image Description / Notes</label>
                <textarea
                  rows={2}
                  value={imageDesc}
                  onChange={(e) => setImageDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] font-medium">
                Image will be stored against this task until visual analytics engine is connected.
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setImageModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
                  Cancel
                </button>
                <button type="submit" disabled={imageSubmitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs">
                  {imageSubmitting ? 'Uploading...' : 'Confirm Image Upload'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
