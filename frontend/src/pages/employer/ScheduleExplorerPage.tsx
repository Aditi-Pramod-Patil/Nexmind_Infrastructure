import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
  CalendarRange,
  Search,
  Layers,
  Filter,
  Loader2,
  FolderKanban
} from 'lucide-react';
import { api } from '../../services/api';

export function ScheduleExplorerPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const projs = (await api.getProjects()) as any[];
        setProjects(projs || []);
        if (projs && projs.length > 0) {
          const storedActiveId = localStorage.getItem('siteflow_active_project_id');
          const target = projs.find(p => p.id === storedActiveId || p.code === storedActiveId) || projs[0];
          setSelectedProjectId(target.id);
          localStorage.setItem('siteflow_active_project_id', target.id);
          const acts = (await api.getProjectActivities(target.id)) as any[];
          setActivities(acts || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleProjectChanged = (e: any) => {
      if (e.detail) {
        handleProjectChange(e.detail);
      }
    };
    window.addEventListener('siteflow_project_changed', handleProjectChanged);
    return () => window.removeEventListener('siteflow_project_changed', handleProjectChanged);
  }, []);

  const handleProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    localStorage.setItem('siteflow_active_project_id', projId);
    setLoading(true);
    try {
      const acts = (await api.getProjectActivities(projId)) as any[];
      setActivities(acts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      (act.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.activity_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiscipline = selectedDiscipline === 'All' || act.discipline === selectedDiscipline;
    const matchesStatus = selectedStatus === 'All' || act.status === selectedStatus;
    return matchesSearch && matchesDiscipline && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Schedule Explorer (WBS Hierarchy)</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Primavera P6 baseline schedule structure with real-time execution progress tracking.
          </p>
        </div>

        {projects.length > 0 && (
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#0F172A] outline-none shadow-2xs"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        )}
      </div>

      <Card className="space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Schedule Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by ID or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium"
            />
          </div>

          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold"
          >
            <option value="All">All Disciplines</option>
            <option value="Civil Works">Civil Works</option>
            <option value="Piping Works">Piping Works</option>
            <option value="Electrical Works">Electrical Works</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Delayed">Delayed</option>
            <option value="At Risk">At Risk</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0 border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-[#0F172A]">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Primavera WBS Line Items</span>
          </div>
          <span>Showing {filteredActivities.length} Activities</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span>Loading schedule activities...</span>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium space-y-2">
            <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No schedule activities found in database</p>
            <p>Create a project and import schedule data to view Primavera WBS line items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Activity ID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Discipline</th>
                  <th className="py-3 px-4">Planned %</th>
                  <th className="py-3 px-4">Actual %</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Confidence Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.map((act) => (
                  <tr
                    key={act.id}
                    onClick={() => navigate(`/employer/activities/${act.activity_id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{act.activity_id}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{act.name}</td>
                    <td className="py-3 px-4 text-slate-600">{act.discipline}</td>
                    <td className="py-3 px-4">{act.planned_progress}%</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{act.actual_progress}%</td>
                    <td className="py-3 px-4">
                      <Badge variant={act.status === 'Delayed' ? 'danger' : act.status === 'At Risk' ? 'warning' : 'success'} size="sm">
                        {act.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{act.ai_confidence || 0}%</td>
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
