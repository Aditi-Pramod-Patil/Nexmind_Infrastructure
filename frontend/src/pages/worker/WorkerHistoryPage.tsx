import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { api } from '../../services/api';
import { History, Filter, Search, Calendar, CheckCircle2 } from 'lucide-react';

export function WorkerHistoryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [reports, setReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistoryData = async (projId: string) => {
    setLoading(true);
    try {
      const [eventsRes, rptsRes] = await Promise.allSettled([
        api.getProjectProgressEvents(projId),
        api.getProjectProgressReports(projId)
      ]);

      const eventList = eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value) ? eventsRes.value : [];
      const reportList = rptsRes.status === 'fulfilled' && Array.isArray(rptsRes.value) ? rptsRes.value : [];

      const combined = [...eventList, ...reportList];
      const uniqueMap = new Map();
      combined.forEach((item: any) => {
        if (item.id) uniqueMap.set(item.id, item);
      });

      const uniqueList = Array.from(uniqueMap.values()).sort((a, b) => {
        const timeA = a.created_at || a.report_date || a.updated_at || '';
        const timeB = b.created_at || b.report_date || b.updated_at || '';
        return timeB.localeCompare(timeA);
      });

      setReports(uniqueList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadWorkerProjects() {
      try {
        const projs = await api.getProjects();
        setProjects(projs || []);
        if (projs && projs.length > 0) {
          const storedActiveId = localStorage.getItem('siteflow_active_project_id');
          const target = projs.find((p: any) => p.id === storedActiveId || p.code === storedActiveId) || projs[0];
          const targetId = selectedProjectId || target.id;
          setSelectedProjectId(targetId);
          fetchHistoryData(targetId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    loadWorkerProjects();

    const handleProjectChanged = (e: any) => {
      if (e.detail) {
        setSelectedProjectId(e.detail);
        fetchHistoryData(e.detail);
      }
    };
    window.addEventListener('siteflow_project_changed', handleProjectChanged);
    return () => window.removeEventListener('siteflow_project_changed', handleProjectChanged);
  }, []);

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    fetchHistoryData(projId);
  };

  const filteredReports = reports.filter((sub) => {
    const desc = sub.raw_input || sub.transcript || sub.description || sub.notes || '';
    const name = sub.activity_name || sub.task_name || '';
    const code = sub.activity_code || sub.activity_id || '';
    const worker = sub.worker_name || '';
    const query = searchQuery.toLowerCase();
    return desc.toLowerCase().includes(query) || name.toLowerCase().includes(query) || code.toLowerCase().includes(query) || worker.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6 font-sans text-slate-900">
      <PageHeader
        title="Field Progress Submission History"
        subtitle="Chronological log of natural language, voice notes, and site image field submissions."
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

      {/* Search Bar */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter submission history by activity, remark, or worker..."
          className="w-full text-xs font-medium text-slate-800 outline-none bg-transparent"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState message="Loading live field submission history from database..." />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon={History}
          title="No submission history found"
          description={searchQuery ? "No past reports match your filter." : "No field progress reports submitted for this project yet."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((sub) => {
            const displayDate = sub.created_at || sub.report_date || (sub.updated_at ? sub.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]);

            const displayProgress = sub.extracted_progress !== undefined && sub.extracted_progress !== null
              ? sub.extracted_progress
              : (sub.progress_percentage !== undefined && sub.progress_percentage !== null
                ? sub.progress_percentage
                : (sub.progress !== undefined && sub.progress !== null ? sub.progress : 0));

            const displayDescription = sub.raw_input || sub.transcript || sub.description || sub.notes || '';
            const displayCode = sub.activity_code || sub.activity_id || 'L6-TASK';
            const displayName = sub.activity_name || sub.task_name || 'Field Progress Event';

            return (
              <Card key={sub.id} className="p-4 space-y-3 border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {displayCode}
                    </span>
                    <Badge variant={sub.status === 'Automatically Matched' || sub.status === 'Confirmed' || sub.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                      {sub.status || 'Submitted'}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{displayName}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Date: {displayDate} • {sub.worker_name || 'Worker'}</span>
                    </p>
                  </div>

                  {displayDescription && (
                    <p className="text-xs text-slate-600 italic font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{displayDescription}"
                    </p>
                  )}
                </div>

                <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs flex justify-between font-semibold mt-2">
                  <span className="text-slate-600">Reported Progress:</span>
                  <span className="font-extrabold text-emerald-700">{displayProgress}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
