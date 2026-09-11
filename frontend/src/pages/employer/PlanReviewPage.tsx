import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  Edit3,
  ChevronDown,
  ChevronRight,
  FolderTree,
  ShieldAlert,
  Loader2,
  ListTodo,
  Lock
} from 'lucide-react';

export function PlanReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectErrorType, setProjectErrorType] = useState<'404' | '403' | 'other' | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Expand / Collapse state
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);
  const [expandedL5, setExpandedL5] = useState<Record<string, boolean>>({});
  const [expandedL6, setExpandedL6] = useState<Record<string, boolean>>({});

  // Task Edit Modal
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editPlannedDate, setEditPlannedDate] = useState('');
  const [editFlagged, setEditFlagged] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const loadProjectAndPlan = async () => {
    if (!id) return;

    console.log('Execution plan project ID:', id);
    console.log('Authenticated user ID:', user?.id);

    setLoadingProject(true);
    setProjectError(null);
    setProjectErrorType(null);
    setPlanError(null);

    // 1. Fetch Project & verify ownership
    let fetchedProject: any = null;
    try {
      fetchedProject = await api.getProjectById(id);
      setProject(fetchedProject);
      console.log('Project employer_id:', fetchedProject?.employer_id);
    } catch (err: any) {
      console.error('Project fetch error:', err);
      try {
        const allProjects = await api.getProjects();
        if (Array.isArray(allProjects)) {
          fetchedProject = allProjects.find(
            (p: any) =>
              p.id === id ||
              p.code === id ||
              p.id?.toString() === id?.toString() ||
              p.code?.toLowerCase() === id?.toLowerCase()
          );
        }
      } catch (e2) {}

      if (fetchedProject) {
        setProject(fetchedProject);
      } else {
        const msg = err.message || '';
        if (msg.includes('403') || msg.includes('authorized') || msg.includes('permission')) {
          setProjectErrorType('403');
          setProjectError("You don't have permission to access this project.");
        } else {
          setProjectErrorType('404');
          setProjectError('Project not found.');
        }
        setLoadingProject(false);
        return;
      }
    } finally {
      setLoadingProject(false);
    }

    // 2. Fetch Execution Plan
    setLoadingPlan(true);
    try {
      let plan = await api.getExecutionPlan(id);

      // Auto-generate if project has workflow but plan is missing
      if (!plan || (!plan.l5Activities?.length && !plan.day_wise_tasks?.length)) {
        if (fetchedProject?.workflow_scope || fetchedProject?.description) {
          plan = await api.generatePlan(id);
        }
      }

      setPlanData(plan);

      // Initialize expand state
      const initL5: Record<string, boolean> = {};
      const initL6: Record<string, boolean> = {};

      if (plan?.l5Activities) {
        plan.l5Activities.forEach((l5: any) => {
          initL5[l5.id || l5.name] = true;
          if (l5.l6Activities) {
            l5.l6Activities.forEach((l6: any) => {
              initL6[l6.id || l6.name] = true;
            });
          }
        });
      }

      setExpandedL5(initL5);
      setExpandedL6(initL6);

    } catch (err: any) {
      console.error('Execution plan fetch error:', err);
      setPlanError(err.message || 'Unable to generate execution plan. Please check the project workflow and try again.');
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    loadProjectAndPlan();
  }, [id, user?.id]);

  const toggleL5 = (l5Key: string) => {
    setExpandedL5(prev => ({ ...prev, [l5Key]: !(prev[l5Key] ?? true) }));
  };

  const toggleL6 = (l6Key: string) => {
    setExpandedL6(prev => ({ ...prev, [l6Key]: !(prev[l6Key] ?? true) }));
  };

  const handleGenerate = async () => {
    if (!id) return;
    setIsGenerating(true);
    setPlanError(null);
    try {
      console.log('Regenerating plan for project ID:', id);
      const plan = await api.generatePlan(id);
      setPlanData(plan);
      
      const proj = await api.getProjectById(id);
      setProject(proj);

      // Re-initialize expand states for regenerated tree
      const initL5: Record<string, boolean> = {};
      const initL6: Record<string, boolean> = {};

      if (plan?.l5Activities) {
        plan.l5Activities.forEach((l5: any) => {
          initL5[l5.id || l5.name] = true;
          if (l5.l6Activities) {
            l5.l6Activities.forEach((l6: any) => {
              initL6[l6.id || l6.name] = true;
            });
          }
        });
      }

      setExpandedL5(initL5);
      setExpandedL6(initL6);

    } catch (err: any) {
      console.error('Regenerate plan error:', err);
      setPlanError(err.message || 'Unable to generate execution plan. Please check the project workflow and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmPlan = async () => {
    if (!id) return;
    setIsConfirming(true);
    try {
      await api.confirmPlan(id);
      navigate(`/employer/projects/${id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm plan.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await api.updateDailyTask(editingTask.id, {
        task_name: editTaskName,
        planned_date: editPlannedDate,
        flagged_for_review: editFlagged,
        review_notes: editNotes
      });
      setEditTaskModalOpen(false);
      loadProjectAndPlan();
    } catch (err: any) {
      alert(err.message || 'Failed to update task.');
    }
  };

  const getNormalizedL5Activities = (): any[] => {
    if (!planData) return [];

    if (planData.l5Activities && planData.l5Activities.length > 0) {
      return planData.l5Activities;
    }

    const tasks = planData.day_wise_tasks || [];
    if (tasks.length === 0) return [];

    const grouped: Record<string, Record<string, any[]>> = {};
    tasks.forEach((t: any) => {
      const l5N = t.l5_name || 'General Package';
      const l6N = t.l6_name || 'General Activity';
      if (!grouped[l5N]) grouped[l5N] = {};
      if (!grouped[l5N][l6N]) grouped[l5N][l6N] = [];
      grouped[l5N][l6N].push({
        id: t.id,
        date: t.planned_date,
        name: t.task_name,
        status: t.status || 'NOT_STARTED',
        progress: t.progress || 0,
        discipline: 'Civil',
        flaggedForReview: t.flagged_for_review,
        reviewNotes: t.review_notes
      });
    });

    return Object.entries(grouped).map(([l5Name, l6Map], idx) => ({
      id: `l5-gen-${idx}`,
      code: `L5-0${idx + 1}`,
      name: l5Name,
      discipline: 'Civil',
      l6Activities: Object.entries(l6Map).map(([l6Name, tList], l6Idx) => ({
        id: `l6-gen-${l6Idx}`,
        code: `L6-0${idx + 1}-0${l6Idx + 1}`,
        name: l6Name,
        discipline: 'Civil',
        tasks: tList
      }))
    }));
  };

  // 1. LOADING PROJECT STATE
  if (loadingProject) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans pt-6">
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-bold">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading project...</span>
        </div>
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  // 2. PROJECT ERROR STATES (404 OR 403)
  if (projectError || !project) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto pt-6">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/employer/projects')}>
          Back to Projects
        </Button>

        {projectErrorType === '403' ? (
          <Card className="p-8 text-center bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl space-y-3">
            <Lock className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="text-lg font-extrabold">You don't have permission to access this project.</h3>
            <p className="text-xs text-amber-800 font-medium">
              This project is not owned by your employer account ({user?.email}).
            </p>
            <div className="pt-2">
              <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/employer/projects')}>
                Go to My Projects
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl space-y-3">
            <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-lg font-extrabold">Project not found.</h3>
            <p className="text-xs text-slate-500 font-medium">
              The requested project ID ({id}) does not exist in the database.
            </p>
            <div className="pt-2">
              <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/employer/projects')}>
                Back to Projects List
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // 3. LOADING PLAN STATE
  if (loadingPlan) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans pt-6">
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-bold">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading execution plan...</span>
        </div>
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const normalizedL5List = getNormalizedL5Activities();
  const flaggedCount = planData?.flagged_tasks_count || 0;
  const isConfirmed = project.plan_status === 'CONFIRMED';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans text-slate-900">
      {/* Navigation Header */}
      <div>
        <button
          onClick={() => navigate(`/employer/projects/${project.id}`)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Project Details</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {project.code}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">GENERATED EXECUTION PLAN</h1>
              <Badge variant={isConfirmed ? 'success' : 'warning'}>
                {isConfirmed ? 'CONFIRMED PLAN' : 'DRAFT REVIEW'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Review automated breakdown derived from project description and workflow scope.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={handleGenerate}
              isLoading={isGenerating}
            >
              Regenerate Plan
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={handleConfirmPlan}
              isLoading={isConfirming}
            >
              Confirm Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Flagged Items Alert Banner */}
      {flaggedCount > 0 && (
        <Card className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start space-x-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">
              {flaggedCount} Task(s) Flagged for Employer Review
            </h4>
            <p className="text-amber-800 mt-0.5 font-medium">
              The analytics engine flagged tasks derived from ambiguous workflow scope. Review notes and confirm plan when satisfied.
            </p>
          </div>
        </Card>
      )}

      {/* Project Description & Workflow Context */}
      {(() => {
        const fullScopeText = project.workflow_scope || project.description || '';
        const isLongText = fullScopeText.length > 280;
        const displayText = isLongText && !isScopeExpanded 
          ? fullScopeText.slice(0, 270) + '...'
          : fullScopeText;

        return (
          <Card className="p-5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 shadow-lg rounded-2xl space-y-3 relative overflow-hidden">
            {/* Background subtle accent gradient glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    PROJECT SCOPE & WORKFLOW SPECIFICATION
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-100">{project.name}</h3>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-300 bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{project.start_date} <span className="text-slate-500">to</span> {project.target_completion}</span>
              </div>
            </div>

            {/* Main Text Content */}
            <div className="text-xs text-slate-200 font-normal leading-relaxed tracking-wide space-y-2">
              <p className="whitespace-pre-line text-slate-200">
                {displayText || 'No detailed workflow scope text provided.'}
              </p>
            </div>

            {/* Read More / Collapse Toggle Button */}
            {isLongText && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400 font-medium">
                  Scope Length: {fullScopeText.length} chars • {fullScopeText.split(' ').length} words
                </span>
                <button
                  type="button"
                  onClick={() => setIsScopeExpanded(!isScopeExpanded)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs"
                >
                  <span>{isScopeExpanded ? 'Show Less' : 'Read Full Scope'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isScopeExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </Card>
        );
      })()}

      {/* PLAN GENERATION ERROR STATE */}
      {planError && (
        <Card className="p-6 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl space-y-2">
          <div className="flex items-center space-x-2 font-bold text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Unable to generate execution plan.</span>
          </div>
          <p className="text-red-700 font-medium">{planError}</p>
          <div className="pt-1">
            <Button variant="primary" size="sm" icon={RefreshCw} onClick={handleGenerate} isLoading={isGenerating}>
              Regenerate Plan
            </Button>
          </div>
        </Card>
      )}

      {/* UNGENERATED PLAN EMPTY STATE */}
      {normalizedL5List.length === 0 && !planError ? (
        <Card className="p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-4 bg-slate-50/50">
          <ListTodo className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">Execution plan not generated yet.</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Your project workflow will be converted into L5/L6 day-wise execution tasks.
            </p>
          </div>
          <div>
            <Button variant="primary" icon={Sparkles} onClick={handleGenerate} isLoading={isGenerating}>
              Generate Execution Plan
            </Button>
          </div>
        </Card>
      ) : (
        /* HIERARCHICAL TREE (L5 -> L6 -> DAY-WISE TASKS) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>EXECUTION HIERARCHY & DAY-WISE TASKS</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {normalizedL5List.length} L5 Packages
            </span>
          </div>

          {normalizedL5List.map((l5: any) => {
            const l5Key = l5.id || l5.name;
            const isL5Expanded = expandedL5[l5Key] ?? true;

            return (
              <Card key={l5Key} className="p-0 overflow-hidden border border-slate-200 bg-white shadow-2xs">
                {/* L5 Package Header */}
                <div
                  onClick={() => toggleL5(l5Key)}
                  className="p-4 bg-slate-900 text-white flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-amber-400 hover:text-amber-300 transition-colors">
                      {isL5Expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <FolderTree className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                        L5 WORK PACKAGE • {l5.code || 'L5'}
                      </span>
                      <h4 className="text-base font-extrabold tracking-tight">{l5.name}</h4>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
                    {l5.l6Activities?.length || 0} L6 Activities
                  </span>
                </div>

                {/* L6 Activities list under L5 */}
                {isL5Expanded && (
                  <div className="divide-y divide-slate-200 bg-slate-50/50">
                    {l5.l6Activities?.map((l6: any) => {
                      const l6Key = l6.id || l6.name;
                      const isL6Expanded = expandedL6[l6Key] ?? true;

                      return (
                        <div key={l6Key} className="p-4 space-y-3">
                          {/* L6 Sub-Header */}
                          <div
                            onClick={() => toggleL6(l6Key)}
                            className="flex items-center justify-between cursor-pointer hover:text-blue-600 transition-colors"
                          >
                            <div className="flex items-center space-x-2.5">
                              {isL6Expanded ? (
                                <ChevronDown className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                {l6.code || 'L6'}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900">
                                L6 — {l6.name}
                              </h5>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                {l6.discipline || 'Civil'}
                              </span>
                            </div>

                            <span className="text-xs font-semibold text-slate-500">
                              {l6.tasks?.length || 0} Day-Wise Tasks
                            </span>
                          </div>

                          {/* Day-Wise Executable Task Cards Grid */}
                          {isL6Expanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pl-6 pt-1">
                              {l6.tasks?.map((t: any) => (
                                <div
                                  key={t.id}
                                  className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all bg-white ${
                                    t.flaggedForReview
                                      ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-300'
                                      : 'border-slate-200 hover:border-blue-400 hover:shadow-2xs'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center space-x-1">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{t.date}</span>
                                    </span>

                                    <Badge
                                      variant={
                                        t.status === 'COMPLETED'
                                          ? 'success'
                                          : t.status === 'IN_PROGRESS'
                                          ? 'warning'
                                          : 'neutral'
                                      }
                                      size="sm"
                                    >
                                      {t.status === 'NOT_STARTED' ? 'Not Started' : t.status}
                                    </Badge>
                                  </div>

                                  <div className="font-extrabold text-slate-900 text-xs leading-snug">
                                    {t.name}
                                  </div>

                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                                    <span className="text-slate-500 font-medium">
                                      Discipline: <strong className="text-slate-800">{t.discipline || l6.discipline}</strong>
                                    </span>

                                    <button
                                      onClick={() => {
                                        setEditingTask(t);
                                        setEditTaskName(t.name);
                                        setEditPlannedDate(t.date);
                                        setEditFlagged(t.flaggedForReview || false);
                                        setEditNotes(t.reviewNotes || '');
                                        setEditTaskModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                      title="Edit Task"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {t.flaggedForReview && (
                                    <div className="text-[10px] text-amber-900 bg-amber-100/80 p-2 rounded-lg font-medium flex items-start space-x-1.5">
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                                      <span>{t.reviewNotes || 'Flagged for review'}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Task Modal */}
      <Modal
        isOpen={editTaskModalOpen}
        onClose={() => setEditTaskModalOpen(false)}
        title="Edit Generated Daily Task"
        subtitle="Modify task details or resolve review flags"
        maxWidth="md"
      >
        <form onSubmit={handleSaveTaskEdit} className="space-y-4 text-xs">
          <Input
            label="Task Title"
            required
            value={editTaskName}
            onChange={(e) => setEditTaskName(e.target.value)}
          />

          <Input
            label="Planned Date"
            type="date"
            required
            value={editPlannedDate}
            onChange={(e) => setEditPlannedDate(e.target.value)}
          />

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="flag-checkbox"
              checked={editFlagged}
              onChange={(e) => setEditFlagged(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="flag-checkbox" className="font-bold text-slate-700">
              Flagged for Review
            </label>
          </div>

          {editFlagged && (
            <Input
              label="Review Notes / Instructions"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Verify pile location quantity with site surveyor..."
            />
          )}

          <div className="pt-3 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={() => setEditTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Task Updates
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
