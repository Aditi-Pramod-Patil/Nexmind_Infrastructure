import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { Layers, ChevronRight, ChevronDown, Search, FolderTree, Upload, Plus } from 'lucide-react';

export function L5L6ActivitiesPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('All');
  const [expandedL5, setExpandedL5] = useState<Record<string, boolean>>({});

  // Schedule upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadJsonText, setUploadJsonText] = useState(`[
  {
    "activity_id": "CIV-040",
    "name": "Pier P4 Reinforcement & Binding",
    "discipline": "Civil Works",
    "l5_name": "Pier Construction",
    "l6_name": "Pier P4 Reinforcement & Binding",
    "wbs_level": "L6",
    "planned_start": "2026-06-01",
    "planned_finish": "2026-07-15",
    "location": "Pier P4 Zone"
  }
]`);

  useEffect(() => {
    async function loadProjects() {
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
    async function loadActivities() {
      if (!selectedProjectId) {
        setActivities([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const acts = (await api.getProjectActivities(selectedProjectId)) as any[];
        setActivities(acts || []);

        // Auto expand all L5 packages
        const initExpand: Record<string, boolean> = {};
        (acts || []).forEach((a: any) => {
          initExpand[a.l5_name || 'Work Package'] = true;
        });
        setExpandedL5(initExpand);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadActivities();
  }, [selectedProjectId]);

  const refreshActivities = async () => {
    if (!selectedProjectId) return;
    try {
      const acts = (await api.getProjectActivities(selectedProjectId)) as any[];
      setActivities(acts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleL5 = (l5Name: string) => {
    setExpandedL5(prev => ({ ...prev, [l5Name]: !prev[l5Name] }));
  };

  const handleScheduleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    try {
      const parsedData = JSON.parse(uploadJsonText);
      await api.uploadScheduleActivities(selectedProjectId, parsedData);
      setShowUploadModal(false);
      await refreshActivities();
    } catch (err: any) {
      alert(`Upload failed: ${err.message || 'Invalid JSON format'}`);
    }
  };

  const filtered = activities.filter(act => {
    const matchesSearch =
      (act.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.activity_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.l5_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDisc = selectedDiscipline === 'All' || act.discipline === selectedDiscipline;
    return matchesSearch && matchesDisc;
  });

  // Group by L5 Package
  const groupedByL5 = filtered.reduce((acc, act) => {
    const l5Key = act.l5_name || 'Work Package';
    if (!acc[l5Key]) acc[l5Key] = [];
    acc[l5Key].push(act);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Title */}
      <PageHeader
        title="L5/L6 Activity Explorer"
        subtitle="Hierarchical schedule tree mapping L5 Work Packages down to L6 Field Activities."
        action={
          <div className="flex items-center space-x-3">
            {projects.length > 0 && (
              <Select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  localStorage.setItem('siteflow_active_project_id', e.target.value);
                }}
                options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.code})` }))}
                className="w-auto font-semibold"
              />
            )}

            <Button
              variant="secondary"
              onClick={() => navigate(`/employer/projects/${selectedProjectId}/plan`)}
              disabled={!selectedProjectId}
            >
              Execution Plan Review
            </Button>

            <Button
              variant="primary"
              icon={Upload}
              onClick={() => setShowUploadModal(true)}
              disabled={!selectedProjectId}
            >
              Upload Schedule Data
            </Button>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <Card className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <Input
            icon={Search}
            placeholder="Search L5 package or L6 line item (e.g. Pier Reinforcement, CIV-034)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            options={[
              { value: 'All', label: 'All Disciplines' },
              { value: 'Civil Works', label: 'Civil Works' },
              { value: 'Piping Works', label: 'Piping Works' },
              { value: 'Electrical Works', label: 'Electrical Works' },
            ]}
          />
        </div>
      </Card>

      {/* Tree Hierarchy Layout */}
      {loading ? (
        <LoadingState message="Loading L5/L6 Schedule Tree..." />
      ) : Object.keys(groupedByL5).length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Schedule Activities"
          description={selectedProjectId ? "No activities found for this project. Import schedule data to map L5 packages and L6 line items." : "Select or create a project to view L5/L6 activities."}
          action={
            selectedProjectId && (
              <Button
                variant="primary"
                icon={Upload}
                onClick={() => setShowUploadModal(true)}
              >
                Upload Schedule Data
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByL5).map(([l5Name, acts]) => {
            const isExpanded = expandedL5[l5Name] !== false;
            const actList = acts as any[];
            const l5ProgressAvg = actList.length > 0
              ? Math.round(actList.reduce((sum: number, a: any) => sum + (Number(a.actual_progress) || 0), 0) / actList.length)
              : 0;

            const l5Status = l5ProgressAvg >= 100 ? 'Completed' : l5ProgressAvg > 0 ? 'In Progress' : 'Not Started';

            return (
              <Card key={l5Name} className="p-0 overflow-hidden border border-slate-200 shadow-2xs">
                {/* L5 Header — Visually Dominates L6 */}
                <div
                  onClick={() => toggleL5(l5Name)}
                  className="p-4 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-200/70 transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <FolderTree className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">L5 Work Package</span>
                      <span className="text-sm font-bold text-slate-900">{l5Name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-emerald-700">{l5ProgressAvg}%</span>
                      <span className="text-[10px] text-slate-400 block font-normal">Planned: 100% • {actList.length} L6 Line Items</span>
                    </div>
                    <Badge variant={l5Status === 'Completed' ? 'success' : l5Status === 'In Progress' ? 'warning' : 'neutral'} size="sm">
                      {l5Status}
                    </Badge>
                  </div>
                </div>

                {/* L5 Progress Bar */}
                <div className="w-full bg-slate-200 h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500"
                    style={{ width: `${Math.min(l5ProgressAvg, 100)}%` }}
                  />
                </div>

                {/* Indented L6 Activities */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 bg-white pl-4 sm:pl-6 border-l-2 border-l-blue-100">
                    {actList.map((act: any) => (
                      <div
                        key={act.id}
                        className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md text-[11px]">
                            {act.activity_id}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{act.l6_name || act.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Discipline: <span className="text-slate-700 font-semibold">{act.discipline}</span> • {act.location || 'Site Zone'} • Planned: {act.planned_start} to {act.planned_finish}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 text-sm">{act.actual_progress}%</span>
                            <span className="text-[10px] text-slate-400 block font-normal">Planned: {act.planned_progress}%</span>
                          </div>
                          <Badge variant={act.status === 'Completed' ? 'success' : act.status === 'In Progress' ? 'warning' : 'neutral'} size="sm">
                            {act.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* SCHEDULE UPLOAD MODAL */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload L5/L6 Schedule Activity Data"
        subtitle="Paste Primavera schedule activities in JSON format to populate project L5 packages and L6 activities."
      >
        <form onSubmit={handleScheduleUploadSubmit} className="space-y-4">
          <Textarea
            label="Schedule Data (JSON)"
            required
            rows={10}
            value={uploadJsonText}
            onChange={(e) => setUploadJsonText(e.target.value)}
            className="font-mono text-xs"
          />

          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Import Schedule Data
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
