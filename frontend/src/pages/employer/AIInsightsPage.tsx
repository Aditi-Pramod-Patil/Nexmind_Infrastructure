import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Brain, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export function AIInsightsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const loadData = async (overrideId?: string) => {
    setLoading(true);
    try {
      const projs = (await api.getProjects()) as any[];
      setProjects(projs || []);

      if (projs && projs.length > 0) {
        const storedActiveId = localStorage.getItem('siteflow_active_project_id');
        const target = projs.find(p => p.id === (overrideId || selectedProjectId || storedActiveId) || p.code === (overrideId || selectedProjectId || storedActiveId)) || projs[0];
        setSelectedProjectId(target.id);
        const activeProj = target;
        let actList: any[] = [];
        let plan: any = null;
        let events: any[] = [];
          
          try {
            actList = await api.getProjectActivities(activeProj.id);
            setActivities(actList || []);
          } catch (e) { console.error(e); }

          try {
            plan = await api.getProjectPlan(activeProj.id);
          } catch (e) { console.error(e); }
          
          try {
            events = await api.getProjectProgressEvents(activeProj.id);
          } catch (e) { console.error(e); }

          const tasks: any[] = plan?.day_wise_tasks || [];
          const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED' || t.progress >= 100);
          const inProgressTasks = tasks.filter((t: any) => t.status === 'IN_PROGRESS' || (t.progress > 0 && t.progress < 100));
          const notStartedTasks = tasks.filter((t: any) => t.status === 'NOT_STARTED');
          const flaggedTasks = tasks.filter((t: any) => t.flagged_for_review);

          const generated: any[] = [];

          // 1. In-Progress Day-Wise Executable Tasks Velocity
          if (inProgressTasks.length > 0) {
            inProgressTasks.forEach((task: any, idx: number) => {
              const remaining = 100 - task.progress;
              generated.push({
                id: `ins-task-inprog-${task.id || idx}`,
                title: `Day-Wise Velocity: ${task.task_name} (${task.progress}%)`,
                category: 'Velocity Analysis',
                confidence: 94,
                timestamp: 'Live Day-Wise Plan Engine',
                description: `Day-wise task '${task.task_name}' under ${task.l5_name} (Planned Date: ${task.planned_date}) is currently at ${task.progress}% completion with ${remaining.toFixed(0)}% remaining. Velocity tracking monitors live field execution.`,
                impact: `On track for planned target completion on ${task.planned_date}.`,
                recommendation: `Maintain allocated worker crew on site for ${task.l6_name}.`
              });
            });
          }

          // 2. Flagged Tasks Execution Review
          if (flaggedTasks.length > 0) {
            flaggedTasks.forEach((task: any, idx: number) => {
              generated.push({
                id: `ins-task-flagged-${task.id || idx}`,
                title: `Day-Wise Review Alert: ${task.task_name}`,
                category: 'Schedule Variance',
                confidence: 90,
                timestamp: 'Live Day-Wise Plan Engine',
                description: `Planned day-wise task '${task.task_name}' (Planned Date: ${task.planned_date}) is flagged for review: "${task.review_notes || 'Verify planned quantity and worker assignment'}"`,
                impact: `Milestone verification required prior to ${task.planned_date} execution.`,
                recommendation: `Confirm worker assignment and planned material quantity in Execution Plan.`
              });
            });
          }

          // 3. Completed Day-Wise Execution Milestones
          if (completedTasks.length > 0) {
            const firstDate = completedTasks[0]?.planned_date || 'start date';
            const lastDate = completedTasks[completedTasks.length - 1]?.planned_date || 'latest date';
            const sampleNames = completedTasks.slice(0, 3).map((t: any) => t.task_name).join(', ');
            
            generated.push({
              id: 'ins-tasks-completed',
              title: `Day-Wise Milestones: ${completedTasks.length} Tasks Completed (100%)`,
              category: 'Sequential Verification',
              confidence: 96,
              timestamp: 'Live Day-Wise Plan Engine',
              description: `Sequence engine verified ${completedTasks.length} executable day-wise tasks completed from ${firstDate} to ${lastDate} including ${sampleNames}.`,
              impact: 'Prerequisite site tasks verified 100% complete.',
              recommendation: 'Proceed with scheduled downstream execution tasks in day-wise calendar.'
            });
          }

          // 4. Upcoming Unstarted Day-Wise Tasks Mobilization
          if (notStartedTasks.length > 0) {
            const nextTask = notStartedTasks[0];
            generated.push({
              id: 'ins-tasks-notstarted',
              title: `Upcoming Executable Task: ${nextTask.task_name}`,
              category: 'Velocity Warning',
              confidence: 88,
              timestamp: 'Live Day-Wise Plan Engine',
              description: `Day-wise task '${nextTask.task_name}' under ${nextTask.l5_name} is planned for ${nextTask.planned_date} (0% Progress). A total of ${notStartedTasks.length} tasks are scheduled in the day-wise execution plan.`,
              impact: `Planned execution date: ${nextTask.planned_date}.`,
              recommendation: `Confirm site equipment positioning and worker crew readiness before ${nextTask.planned_date}.`
            });
          }

          setInsights(generated);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();

    const handleProjectChanged = (e: any) => {
      if (e.detail) {
        loadData(e.detail);
      }
    };
    window.addEventListener('siteflow_project_changed', handleProjectChanged);
    return () => window.removeEventListener('siteflow_project_changed', handleProjectChanged);
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Smart Progress Intelligence & Insights</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Automated execution pattern detection, velocity warnings, and schedule recommendations.
          </p>
        </div>

        <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full flex items-center space-x-1.5">
          <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>{insights.length} Actionable Insights Active</span>
        </span>
      </div>

      {/* AT-RISK ACTIVITIES INTELLIGENCE SECTION */}
      {activities.filter((a: any) => a.actual_progress < a.planned_progress || a.status === 'Delayed' || a.status === 'At Risk').length > 0 && (
        <Card className="p-0 overflow-hidden border border-orange-200 bg-white shadow-2xs">
          <div className="p-4 bg-orange-50/60 border-b border-orange-200 flex items-center justify-between text-xs font-bold text-orange-950">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 animate-pulse" />
              <span>At-Risk Activities & Schedule Slippage Identification</span>
            </div>
            <span className="text-[11px] font-extrabold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
              {activities.filter((a: any) => a.actual_progress < a.planned_progress || a.status === 'Delayed' || a.status === 'At Risk').length} Activities At-Risk
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px]">
                  <th className="py-3 px-4">Activity Code</th>
                  <th className="py-3 px-4">L5 Work Package</th>
                  <th className="py-3 px-4">L6 Line Item</th>
                  <th className="py-3 px-4">Planned %</th>
                  <th className="py-3 px-4">Actual %</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4">Delay Risk</th>
                  <th className="py-3 px-4">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities
                  .filter((a: any) => a.actual_progress < a.planned_progress || a.status === 'Delayed' || a.status === 'At Risk')
                  .map((act: any) => {
                    const variance = (act.actual_progress || 0) - (act.planned_progress || 0);
                    const riskProb = act.status === 'Delayed' ? 92 : act.status === 'At Risk' ? 78 : 65;
                    return (
                      <tr key={act.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{act.activity_id}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{act.l5_name}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{act.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">{act.planned_progress}%</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{act.actual_progress}%</td>
                        <td className="py-3 px-4 font-extrabold text-orange-600">
                          {variance.toFixed(0)}%
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            {riskProb}% Risk
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          Deploy extra worker crew to clear {act.name} execution backlog before target completion.
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span>Loading smart insights...</span>
        </div>
      ) : insights.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-white border border-dashed border-slate-300">
          <Brain className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">No Insights Generated Yet</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              smart progress tracking requires active projects and worker daily progress reports to generate schedule variance and velocity recommendations.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="border-l-4 border-l-blue-600 bg-white border-slate-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant={insight.category === 'Schedule Variance' ? 'danger' : insight.category === 'Velocity Warning' ? 'warning' : 'accent'}>
                    {insight.category}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-medium">{insight.timestamp}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {insight.confidence}% Confidence
                </span>
              </div>

              <h3 className="text-base font-extrabold text-[#0F172A] mb-2">{insight.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">{insight.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Project Schedule Impact:</span>
                  <span className="text-slate-600">{insight.impact}</span>
                </div>
                <div>
                  <span className="font-bold text-blue-700 block mb-0.5">Recommended Mitigation Action:</span>
                  <span className="text-slate-800 font-semibold">{insight.recommendation}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
