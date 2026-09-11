import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProgressBar } from '../../components/common/ProgressBar';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { api } from '../../services/api';
import { FolderKanban, Plus, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { CreateProjectModal } from '../../components/employer/CreateProjectModal';

export function ProjectsListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api.getProjects()) as any[];
      setProjects(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectCreated = (createdProject: any) => {
    fetchProjects();
    if (createdProject && createdProject.id) {
      localStorage.setItem('siteflow_active_project_id', createdProject.id);
      window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: createdProject.id }));
      navigate(`/employer/projects/${createdProject.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Projects"
        subtitle="Manage your construction projects and baseline schedules."
        action={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            Create New Project
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Loading projects from database..." />
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchProjects}>Retry</Button>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first construction project to start tracking L5/L6 activities and project progress."
          action={
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setCreateModalOpen(true)}
            >
              Create New Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <Card
              key={proj.id}
              hoverable
              onClick={() => {
                localStorage.setItem('siteflow_active_project_id', proj.id);
                window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: proj.id }));
                navigate(`/employer/projects/${proj.id}`);
              }}
              className="flex flex-col justify-between border border-slate-200 bg-white shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    {proj.code}
                  </span>
                  <Badge variant={proj.status === 'Delayed' ? 'danger' : 'success'} size="sm">
                    {proj.status}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{proj.name}</h3>
                <p className="text-xs text-slate-500 mb-3 flex items-center space-x-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{proj.location || 'Site Area'} • Client: <strong className="text-slate-700 font-semibold">{proj.client || 'Enterprise Client'}</strong></span>
                </p>

                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">{proj.description || 'Enterprise Infrastructure Project'}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Progress</span>
                    <span>{proj.actual_progress}% / {proj.baseline_progress}%</span>
                  </div>
                  <ProgressBar
                    progress={proj.actual_progress}
                    variant={proj.status === 'Delayed' ? 'red' : 'emerald'}
                    height="sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Start: <strong className="text-slate-800 font-semibold">{proj.start_date || 'N/A'}</strong></span>
                <Button variant="ghost" size="sm" icon={ChevronRight} className="text-blue-600 font-semibold hover:text-blue-700">
                  Open Project
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
