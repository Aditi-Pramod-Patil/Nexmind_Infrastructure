import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { api } from '../../services/api';
import { ArrowLeft, MapPin, Loader2, AlertCircle } from 'lucide-react';

export function ActivityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadActivity() {
      setLoading(true);
      try {
        const projs = (await api.getProjects()) as any[];
        let found = null;
        for (const p of projs) {
          const acts = (await api.getProjectActivities(p.id)) as any[];
          const match = acts.find((a) => a.activity_id === id || a.id === id);
          if (match) {
            found = match;
            break;
          }
        }
        setActivity(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span>Loading activity details from database...</span>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/employer/activities')} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to L5/L6 Activities</span>
        </button>

        <Card className="p-12 text-center space-y-3 bg-white border border-dashed border-slate-300">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Activity Not Found</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              No activity with ID "{id}" exists in the current database.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const plannedProgress = activity.planned_progress || 0;
  const actualProgress = activity.actual_progress || 0;
  const variance = actualProgress - plannedProgress;

  return (
    <div className="space-y-6 font-sans">
      {/* Back button */}
      <button onClick={() => navigate('/employer/activities')} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to L5/L6 Activities</span>
      </button>

      {/* Activity Header */}
      <Card className="border border-blue-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-md">
                {activity.activity_id}
              </span>
              <h1 className="text-xl font-extrabold text-[#0F172A]">{activity.name}</h1>
              <Badge variant={activity.status === 'Delayed' ? 'danger' : activity.status === 'At Risk' ? 'warning' : 'success'}>
                {activity.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-2 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location: {activity.location || 'Site Zone'} • Discipline: {activity.discipline}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-bold uppercase">Match Confidence</span>
            <span className="text-2xl font-extrabold text-emerald-600">{activity.ai_confidence || 0}% Verified</span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-4">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">L5 Work Package</span>
            <span className="font-bold text-[#0F172A]">{activity.l5_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">L6 Activity Item</span>
            <span className="font-bold text-[#0F172A]">{activity.l6_name || activity.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Planned Start → Finish</span>
            <span className="font-semibold text-slate-800">{activity.planned_start} → {activity.planned_finish}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Actual Start → Finish</span>
            <span className="font-semibold text-emerald-700">{activity.actual_start || 'Not started'} → {activity.actual_finish || 'In Progress'}</span>
          </div>
        </div>
      </Card>

      {/* Progress Card */}
      <Card>
        <h3 className="text-base font-bold text-[#0F172A] mb-4">Progress Execution Variance</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-baseline text-xs font-bold">
            <span className="text-slate-700">Planned Progress: {plannedProgress}%</span>
            <span className="text-blue-600">Actual Progress: {actualProgress}%</span>
            <span className={variance < 0 ? 'text-red-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
              Variance: {variance}%
            </span>
          </div>
          <ProgressBar progress={actualProgress} variant={variance < 0 ? 'red' : 'emerald'} height="lg" />
        </div>
      </Card>
    </div>
  );
}
