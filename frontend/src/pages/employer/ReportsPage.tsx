import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import {
  FileText,
  Download,
  Printer,
  Loader2,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Layers,
  Users,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

export function ReportsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeProject, setActiveProject] = useState<any | null>(null);
  
  const [activities, setActivities] = useState<any[]>([]);
  const [dayWiseTasks, setDayWiseTasks] = useState<any[]>([]);
  const [progressEvents, setProgressEvents] = useState<any[]>([]);
  const [consolidatedProgress, setConsolidatedProgress] = useState<any | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportTitle, setSelectedReportTitle] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      try {
        const projs = (await api.getProjects()) as any[];
        setProjects(projs || []);
        if (projs && projs.length > 0) {
          const storedActiveId = localStorage.getItem('siteflow_active_project_id');
          const target = projs.find(p => p.id === storedActiveId || p.code === storedActiveId) || projs[0];
          setSelectedProjectId(target.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();

    const handleProjectChanged = (e: any) => {
      if (e.detail) {
        setSelectedProjectId(e.detail);
      }
    };
    window.addEventListener('siteflow_project_changed', handleProjectChanged);
    return () => window.removeEventListener('siteflow_project_changed', handleProjectChanged);
  }, []);

  useEffect(() => {
    async function loadReportData() {
      if (!selectedProjectId) return;
      setReportLoading(true);
      try {
        const proj = await api.getProjectById(selectedProjectId);
        setActiveProject(proj);

        const acts = await api.getProjectActivities(selectedProjectId);
        setActivities(acts || []);

        const plan = await api.getProjectPlan(selectedProjectId);
        setDayWiseTasks(plan?.day_wise_tasks || []);

        try {
          const events = await api.getProjectProgressEvents(selectedProjectId);
          setProgressEvents(events || []);
        } catch (e) {
          setProgressEvents([]);
        }

        try {
          const consolidated = await api.getConsolidatedProgress(selectedProjectId);
          setConsolidatedProgress(consolidated);
        } catch (e) {
          setConsolidatedProgress(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setReportLoading(false);
      }
    }

    loadReportData();
  }, [selectedProjectId]);

  const reports = [
    {
      id: 'rpt-daily',
      title: 'Daily Site Progress Report (DPR)',
      description: 'Comprehensive summary of field events, supervisor logs, voice notes, and Smart activity matches.',
      lastGenerated: 'Real-time',
      type: 'Executive Daily'
    },
    {
      id: 'rpt-weekly',
      title: 'Weekly EPC Schedule Variance Report',
      description: 'Weekly Primavera baseline vs actual progress S-Curve, discipline progress deltas, and milestone forecast.',
      lastGenerated: 'Real-time',
      type: 'Management Weekly'
    },
    {
      id: 'rpt-delay',
      title: 'Critical Path Delay & Risk Audit',
      description: 'Detailed breakdown of high-risk line items, joint velocity lags, and Smart root cause explanations.',
      lastGenerated: 'Real-time',
      type: 'Risk Audit'
    },
    {
      id: 'rpt-discipline',
      title: 'Discipline-Wise Performance Summary',
      description: 'Granular status breakdown for Civil, Piping, Electrical, Instrumentation, and HSE field units.',
      lastGenerated: 'Real-time',
      type: 'Discipline Track'
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!activeProject || !selectedReportId) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    const projName = (activeProject.name || 'Project').replace(/,/g, ' ');

    if (selectedReportId === 'rpt-daily') {
      csvContent += `Daily Site Progress Report (DPR) - ${projName}\n`;
      csvContent += `Date,Worker,Source,Input,Extracted Progress,Status,Matched Activity\n`;
      progressEvents.forEach((ev) => {
        csvContent += `"${ev.created_at || ''}","${(ev.worker_name || 'Worker').replace(/"/g, '""')}","${ev.source_type || 'TEXT'}","${(ev.raw_input || '').replace(/"/g, '""')}","${ev.extracted_progress ?? ''}%","${ev.status || ''}","${ev.activity_code || ''} - ${(ev.activity_name || '').replace(/"/g, '""')}"\n`;
      });
    } else if (selectedReportId === 'rpt-weekly') {
      csvContent += `Weekly EPC Schedule Variance Report - ${projName}\n`;
      csvContent += `Activity ID,Description,Discipline,Planned Progress,Actual Progress,Variance,Status\n`;
      activities.forEach((act) => {
        const planned = act.planned_progress || 0;
        const actual = act.actual_progress || 0;
        const variance = actual - planned;
        csvContent += `"${act.activity_id}","${(act.name || '').replace(/"/g, '""')}","${act.discipline || 'Civil'}","${planned}%","${actual}%","${variance}%","${act.status || ''}"\n`;
      });
    } else if (selectedReportId === 'rpt-delay') {
      csvContent += `Critical Path Delay & Risk Audit - ${projName}\n`;
      csvContent += `Task ID/Code,Task Name,L5 Package,Status,Progress,Notes/Evidence\n`;
      dayWiseTasks.filter(t => t.status === 'DELAYED' || t.status === 'BLOCKED' || t.progress < 100).forEach((t) => {
        csvContent += `"${t.id}","${(t.task_name || '').replace(/"/g, '""')}","${(t.l5_name || '').replace(/"/g, '""')}","${t.status}","${t.progress}%","${(t.review_notes || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      csvContent += `Discipline-Wise Performance Summary - ${projName}\n`;
      csvContent += `Discipline,Activity ID,L6 Line Item,Planned %,Actual %,Status,Confidence Score\n`;
      activities.forEach((act) => {
        csvContent += `"${act.discipline || 'Civil'}","${act.activity_id}","${(act.name || '').replace(/"/g, '""')}","${act.planned_progress}%","${act.actual_progress}%","${act.status}","${act.ai_confidence || 0}%"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReportId}_${activeProject.code || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group activities by Discipline
  const disciplineGroups: Record<string, any[]> = activities.reduce((acc, act) => {
    const disc = act.discipline || 'Civil Works';
    if (!acc[disc]) acc[disc] = [];
    acc[disc].push(act);
    return acc;
  }, {} as Record<string, any[]>);

  // Group activities by L5 Package for Weekly Report
  const l5Groups: Record<string, any[]> = activities.reduce((acc, act) => {
    const l5 = act.l5_name || 'General Work Package';
    if (!acc[l5]) acc[l5] = [];
    acc[l5].push(act);
    return acc;
  }, {} as Record<string, any[]>);

  const overallProgress = consolidatedProgress ? consolidatedProgress.overall_progress : (activeProject?.actual_progress || 0);
  const reportingWorkers = consolidatedProgress?.workers_reporting_count || 0;
  const totalWorkers = consolidatedProgress?.total_workers_count || 1;
  const completedTasks = dayWiseTasks.filter(t => t.status === 'COMPLETED' || t.progress >= 100).length;
  const inProgressTasks = dayWiseTasks.filter(t => t.status === 'IN_PROGRESS' || (t.progress > 0 && t.progress < 100)).length;
  const delayedTasks = dayWiseTasks.filter(t => t.status === 'DELAYED' || t.status === 'BLOCKED').length;

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Automated Project Reports</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Generate 100% data-driven executive briefs compiled from worker field updates and day-wise execution plans.
          </p>
        </div>

        {projects.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-600">Active Project:</span>
            <Select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.code})` }))}
              className="w-auto font-bold text-xs"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span>Loading project report configurations...</span>
        </div>
      ) : !activeProject ? (
        <Card className="p-12 text-center space-y-3 bg-white border border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900">No Projects Available for Reporting</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Create a project to generate daily site progress reports, weekly schedule variance audits, and discipline summaries.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((rpt) => (
            <Card key={rpt.id} className="flex flex-col justify-between hover:border-blue-500 bg-white border-slate-200 shadow-2xs transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase">
                    {rpt.type}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{rpt.lastGenerated}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{rpt.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">{rpt.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Data: Legitimate Field Updates</span>
                <button
                  onClick={() => {
                    setSelectedReportId(rpt.id);
                    setSelectedReportTitle(rpt.title);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-2xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-300" />
                  <span>Generate Preview</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* FULL REPORT PREVIEW MODAL */}
      <Modal
        isOpen={!!selectedReportId}
        onClose={() => setSelectedReportId(null)}
        title={selectedReportTitle || 'Project Executive Report'}
        subtitle={activeProject ? `${activeProject.name} (${activeProject.code}) • Verified Field Data` : 'Report Preview'}
        maxWidth="2xl"
      >
        {reportLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span>Compiling report from database records...</span>
          </div>
        ) : (
          <div className="space-y-6 text-xs text-slate-900 print:text-black">
            {/* Executive Document Banner Header */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-extrabold text-white text-sm tracking-tight">SITEFLOW EXECUTIVE BRIEF</span>
                </div>
                <span className="font-mono text-amber-300 text-[11px]">
                  DOC ID: {selectedReportId?.toUpperCase()}-{activeProject?.code || '01'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-200 font-medium">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Project Name</span>
                  <span className="font-bold text-white text-xs">{activeProject?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Field Progress</span>
                  <span className="font-extrabold text-amber-400 text-xs">{overallProgress}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-emerald-400 text-xs">{activeProject?.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Report Date</span>
                  <span className="font-bold text-white text-xs">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* REPORT TYPE 1: DAILY SITE PROGRESS REPORT (DPR) */}
            {selectedReportId === 'rpt-daily' && (
              <div className="space-y-5">
                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Workers Reporting</span>
                    <span className="text-lg font-extrabold text-slate-900">{reportingWorkers} / {totalWorkers}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Completed Tasks</span>
                    <span className="text-lg font-extrabold text-emerald-600">{completedTasks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">In Progress / Delayed</span>
                    <span className="text-lg font-extrabold text-blue-600">{inProgressTasks} / {delayedTasks}</span>
                  </div>
                </div>

                {/* Worker Field Submissions Log */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Submitted Worker Field Updates ({progressEvents.length})</span>
                  </h4>

                  {progressEvents.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-medium bg-slate-50 border border-slate-200 rounded-xl">
                      No worker voice, text, or photo reports submitted today.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {progressEvents.map((ev) => (
                        <div key={ev.id} className="p-3 bg-white space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="accent" size="sm">{ev.source_type || 'VOICE'}</Badge>
                              <span className="font-bold text-slate-900">{ev.worker_name || 'Field Worker'}</span>
                              {ev.activity_code && (
                                <span className="font-mono text-blue-600 font-bold">[{ev.activity_code}]</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{ev.created_at}</span>
                          </div>
                          <p className="text-slate-700 italic font-medium">"{ev.raw_input}"</p>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
                            <span>Matched Activity: <strong className="text-slate-800">{ev.activity_name || 'L6 Line Item'}</strong></span>
                            <span className="font-bold text-emerald-600">
                              Extracted Progress: {ev.extracted_progress !== null && ev.extracted_progress !== undefined ? `${ev.extracted_progress}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Day-Wise Execution Tasks Table */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Day-Wise Executable Task Execution Status</span>
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">L5 Work Package</th>
                          <th className="p-2.5">Task Name</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dayWiseTasks.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-slate-500">{t.planned_date}</td>
                            <td className="p-2.5 font-semibold text-slate-700">{t.l5_name}</td>
                            <td className="p-2.5 font-bold text-slate-900">{t.task_name}</td>
                            <td className="p-2.5">
                              <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'IN_PROGRESS' ? 'warning' : 'danger'} size="sm">
                                {t.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-extrabold text-emerald-700">{t.progress}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* REPORT TYPE 2: WEEKLY EPC SCHEDULE VARIANCE REPORT */}
            {selectedReportId === 'rpt-weekly' && (() => {
              const baselineTarget = Number(activeProject?.baseline_progress || 100);
              const scheduleVariance = (overallProgress - baselineTarget).toFixed(1);

              return (
                <div className="space-y-5">
                  {/* Variance Overview Banner */}
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Baseline Target</span>
                      <span className="text-xl font-extrabold text-slate-900">{baselineTarget}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Verified Actual Field Progress</span>
                      <span className="text-xl font-extrabold text-blue-600">{overallProgress}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Schedule Variance</span>
                      <span className={`text-xl font-extrabold ${Number(scheduleVariance) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {Number(scheduleVariance) >= 0 ? `+${scheduleVariance}%` : `${scheduleVariance}%`}
                      </span>
                    </div>
                  </div>

                  {/* L5 Package Level Variance Breakdown */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>L5 Work Package Baseline vs Actual Variance</span>
                    </h4>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                            <th className="p-2.5">L5 Package Name</th>
                            <th className="p-2.5">L6 Items</th>
                            <th className="p-2.5">Planned %</th>
                            <th className="p-2.5">Actual %</th>
                            <th className="p-2.5">Variance</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(l5Groups).map(([l5Name, acts]) => {
                            const actList = acts as any[];
                            const l5PlannedAvg = Math.round(actList.reduce((sum, a) => sum + (a.planned_progress || 100), 0) / actList.length);
                            const l5ActualAvg = Math.round(actList.reduce((sum, a) => sum + (a.actual_progress || 0), 0) / actList.length);
                            const variance = l5ActualAvg - l5PlannedAvg;
                            return (
                              <tr key={l5Name} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-slate-900">{l5Name}</td>
                                <td className="p-2.5 text-slate-600 font-semibold">{actList.length} Items</td>
                                <td className="p-2.5 text-slate-600 font-semibold">{l5PlannedAvg}%</td>
                                <td className="p-2.5 font-bold text-blue-600">{l5ActualAvg}%</td>
                                <td className={`p-2.5 font-extrabold ${variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {variance >= 0 ? `+${variance}%` : `${variance}%`}
                                </td>
                                <td className="p-2.5">
                                  <Badge variant={l5ActualAvg >= l5PlannedAvg ? 'success' : l5ActualAvg > 0 ? 'warning' : 'neutral'} size="sm">
                                    {l5ActualAvg >= l5PlannedAvg ? 'On Track' : l5ActualAvg > 0 ? 'Behind Schedule' : 'Not Started'}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Milestone Forecast */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-extrabold text-slate-900 block text-xs">Milestone Forecast & Velocity Analysis</span>
                    <p className="text-slate-600 font-medium">
                      Target Completion Date: <strong className="text-slate-900">{activeProject?.target_completion || 'N/A'}</strong>.
                      {overallProgress >= baselineTarget
                        ? ` Verified actual field progress (${overallProgress}%) is executing on track with the baseline project completion schedule.`
                        : ` Verified actual field progress (${overallProgress}%) indicates a ${(baselineTarget - overallProgress).toFixed(1)}% schedule gap against the baseline target.`}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* REPORT TYPE 3: CRITICAL PATH DELAY & RISK AUDIT */}
            {selectedReportId === 'rpt-delay' && (() => {
              const laggingItems = dayWiseTasks.filter(t => t.status === 'DELAYED' || t.status === 'BLOCKED' || t.progress < 100);
              const dynamicMitigations = laggingItems.length > 0
                ? laggingItems.slice(0, 3).map((t) =>
                    t.status === 'BLOCKED'
                      ? `Clear access and PO bottlenecks for ${t.task_name} under ${t.l5_name}.`
                      : `Deploy additional crew shift to clear ${t.task_name} execution backlog (${t.progress}% complete).`
                  )
                : [
                    'All active execution tasks are executing on schedule; maintain current site crew allocations.',
                    'Continue monitoring material arrival schedules against upcoming day-wise milestones.'
                  ];

              return (
                <div className="space-y-5">
                  {/* Risk Audit Header */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-red-950 text-sm">Critical Path Delay & Schedule Audit</h4>
                        <p className="text-red-800 text-[11px] font-medium">
                          Identifies lagging execution tasks, blocked prerequisites, and Smart mitigation steps.
                        </p>
                      </div>
                    </div>
                    <Badge variant="danger" size="md">{laggingItems.length} Lagging Items</Badge>
                  </div>

                  {/* Lagging / Blocked Tasks Table */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>Lagging & Blocked Day-Wise Tasks ({laggingItems.length})</span>
                    </h4>

                    {laggingItems.length === 0 ? (
                      <div className="p-4 bg-white border border-slate-200 rounded-xl text-center text-slate-500 font-medium">
                        No lagging or blocked execution tasks flagged in the database.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                              <th className="p-2.5">Task Name</th>
                              <th className="p-2.5">L5 Package</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5">Actual %</th>
                              <th className="p-2.5">Field Notes / Evidence</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {laggingItems.map((t) => (
                              <tr key={t.id} className="hover:bg-red-50/20">
                                <td className="p-2.5 font-bold text-slate-900">{t.task_name}</td>
                                <td className="p-2.5 text-slate-600 font-medium">{t.l5_name}</td>
                                <td className="p-2.5">
                                  <Badge variant={t.status === 'BLOCKED' ? 'danger' : 'warning'} size="sm">
                                    {t.status}
                                  </Badge>
                                </td>
                                <td className="p-2.5 font-extrabold text-blue-600">{t.progress}%</td>
                                <td className="p-2.5 text-slate-600 italic font-medium">{t.review_notes || 'Pending crew execution'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Schedule Mitigation Actions */}
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                    <span className="font-extrabold text-emerald-950 block text-xs flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Recommended Schedule Mitigation Actions</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                      {dynamicMitigations.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}

            {/* REPORT TYPE 4: DISCIPLINE-WISE PERFORMANCE SUMMARY */}
            {selectedReportId === 'rpt-discipline' && (
              <div className="space-y-5">
                {/* Discipline Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(disciplineGroups).map(([disc, acts]) => {
                    const actList = acts as any[];
                    const avg = Math.round(actList.reduce((s, a) => s + (a.actual_progress || 0), 0) / actList.length);
                    return (
                      <div key={disc} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{disc}</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-extrabold text-slate-900">{avg}%</span>
                          <span className="text-xs text-blue-600 font-bold">{actList.length} Line Items</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Full Activity Matrix by Discipline */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Primavera Activity Status by Discipline</span>
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          <th className="p-2.5">Discipline</th>
                          <th className="p-2.5">Activity ID</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5">Planned %</th>
                          <th className="p-2.5">Actual %</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Confidence Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activities.map((act) => (
                          <tr key={act.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-600">{act.discipline || 'Civil Works'}</td>
                            <td className="p-2.5 font-mono font-bold text-blue-600">{act.activity_id}</td>
                            <td className="p-2.5 font-bold text-slate-900">{act.name}</td>
                            <td className="p-2.5 text-slate-600">{act.planned_progress}%</td>
                            <td className="p-2.5 font-extrabold text-blue-600">{act.actual_progress}%</td>
                            <td className="p-2.5">
                              <Badge variant={act.status === 'Delayed' ? 'danger' : act.status === 'At Risk' ? 'warning' : 'success'} size="sm">
                                {act.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-bold text-emerald-700">{act.ai_confidence || 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar (Print & Export) */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Executive Brief</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-2xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Report Data (CSV)</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
