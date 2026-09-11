import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { api } from '../../services/api';
import { CheckSquare, MapPin, Search, Filter, Layers } from 'lucide-react';
import { formatTaskForDisplay } from '../../utils/taskFormatter';

export function WorkerActivitiesPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activities, setActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkerActivities() {
      setLoading(true);
      try {
        const projs = await api.getProjects();
        setProjects(projs || []);
        if (projs && projs.length > 0) {
          const activeId = selectedProjectId || projs[0].id;
          setSelectedProjectId(activeId);
          const actList = await api.getProjectActivities(activeId);
          setActivities(actList || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkerActivities();
  }, [selectedProjectId]);

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    setLoading(true);
    try {
      const actList = await api.getProjectActivities(projId);
      setActivities(actList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter((act) =>
    (act.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (act.activity_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (act.l5_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (act.l6_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-slate-900">
      <PageHeader
        title="Assigned L5/L6 Activities"
        subtitle="View schedule line items, target progress baselines, and current field completion status."
        action={
          projects.length > 1 && (
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-2xs cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
          )
        }
      />

      {/* Search & Filter Bar */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by activity name, WBS ID, or package..."
          className="w-full text-xs font-medium text-slate-800 outline-none bg-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState message="Loading assigned project activities..." />
      ) : filteredActivities.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No activities found"
          description={searchQuery ? "No schedule activities match your search term." : "No L5/L6 activities assigned for this project yet."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((act) => (
            <Card key={act.id} className="p-4 space-y-3 border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {act.activity_id}
                  </span>
                  <Badge variant={act.status === 'Completed' ? 'success' : act.status === 'Delayed' ? 'danger' : 'warning'} size="sm">
                    {act.status}
                  </Badge>
                </div>

                {(() => {
                  const formatted = formatTaskForDisplay({ l5_name: act.l5_name, l6_name: act.l6_name, task_name: act.name });
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Layers className="w-3 h-3 mr-1 text-blue-600" />
                          {formatted.cleanPackageName}
                        </span>
                        {formatted.subPackageName && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {formatted.subPackageName}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight pt-0.5">{formatted.displayTitle}</h4>
                      {formatted.scopeItems.length > 0 && (
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-2 pt-0.5">
                          Scope: {formatted.scopeItems.slice(0, 3).join(', ')}{formatted.scopeItems.length > 3 ? ` +${formatted.scopeItems.length - 3} more` : ''}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">Planned Target:</span>
                  <span className="font-bold text-slate-900">{act.planned_progress}%</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">Actual Field:</span>
                  <span className="font-extrabold text-emerald-600">{act.actual_progress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(act.actual_progress, 100)}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
