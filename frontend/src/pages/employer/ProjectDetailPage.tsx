import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { api } from '../../services/api';
import {
  ArrowLeft,
  Edit3,
  Copy,
  Plus,
  Users,
  Layers,
  FileText,
  Camera,
  Upload,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  UserCheck,
  Search,
  UserCheck2,
  AlertTriangle
} from 'lucide-react';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [projectSupervisors, setProjectSupervisors] = useState<any[]>([]);
  const [progressReports, setProgressReports] = useState<any[]>([]);
  const [siteImages, setSiteImages] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'team' | 'progress' | 'images' | 'schedule'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Project Modal
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Delete Project Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Assign Supervisor Modal
  const [assignSupervisorModalOpen, setAssignSupervisorModalOpen] = useState(false);
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('Civil');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [isAssigningSupervisor, setIsAssigningSupervisor] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);

  // Upload Image Modal State
  const [uploadImageModalOpen, setUploadImageModalOpen] = useState(false);
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null);
  const [uploadImageDesc, setUploadImageDesc] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fetchProjectData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      let projData: any = null;
      try {
        projData = await api.getProjectById(id);
      } catch (e) {
        try {
          const allProjects = await api.getProjects();
          if (Array.isArray(allProjects)) {
            projData = allProjects.find(
              (p: any) =>
                p.id === id ||
                p.code === id ||
                p.id?.toString() === id?.toString() ||
                p.code?.toLowerCase() === id?.toLowerCase()
            );
          }
        } catch (err2) {}
      }

      if (!projData) {
        throw new Error('Project not found.');
      }

      setProject(projData);

      setEditName(projData.name || '');
      setEditClient(projData.client || '');
      setEditLocation(projData.location || '');

      const realId = projData.id || id;

      // Load sub-resources safely
      try {
        const actList = await api.getProjectActivities(realId);
        setActivities(Array.isArray(actList) ? actList : []);
      } catch (e) {
        setActivities([]);
      }

      try {
        const members = await api.getProjectMembers(realId);
        setProjectMembers(Array.isArray(members) ? members : []);
      } catch (e) {
        setProjectMembers([]);
      }

      try {
        const sups = await api.getProjectSupervisors(realId);
        setProjectSupervisors(Array.isArray(sups) ? sups : []);
      } catch (e) {
        setProjectSupervisors([]);
      }

      try {
        const reports = await api.getProjectProgressReports(realId);
        setProgressReports(Array.isArray(reports) ? reports : []);
      } catch (e) {
        setProgressReports([]);
      }

      try {
        const imgs = await api.getProjectSiteImages(realId);
        setSiteImages(Array.isArray(imgs) ? imgs : []);
      } catch (e) {
        setSiteImages([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const handleCopyCode = () => {
    if (!project?.project_access_code) return;
    navigator.clipboard.writeText(project.project_access_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Delete Project Handler
  const handleConfirmDeleteProject = async () => {
    if (!id) return;
    setIsDeletingProject(true);
    try {
      await api.deleteProject(id);
      if (localStorage.getItem('siteflow_active_project_id') === id) {
        localStorage.removeItem('siteflow_active_project_id');
        window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: null }));
      }
      setDeleteModalOpen(false);
      navigate('/employer/projects');
    } catch (err: any) {
      alert(err.message || 'Failed to delete project.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Open Assign Supervisor Modal
  const handleOpenAssignSupervisor = async () => {
    try {
      const available = await api.getAvailableSupervisors();
      setAvailableSupervisors(available || []);
      if (available && available.length > 0) {
        setSelectedSupervisorId(available[0].id);
      }
      setAssignSupervisorModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Supervisor Assignment
  const handleAssignSupervisorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedSupervisorId) return;

    setIsAssigningSupervisor(true);
    try {
      await api.assignSupervisor(id, {
        supervisor_id: selectedSupervisorId,
        discipline: selectedDiscipline
      });

      const updatedSups = await api.getProjectSupervisors(id);
      setProjectSupervisors(updatedSups || []);
      setAssignSupervisorModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to assign supervisor.');
    } finally {
      setIsAssigningSupervisor(false);
    }
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await api.createProject({
        name: editName,
        client: editClient,
        location: editLocation,
        start_date: project.start_date,
        target_completion: project.target_completion
      });

      setEditProjectModalOpen(false);
      fetchProjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to update project.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      await api.uploadProjectSchedule(id, file);
      fetchProjectData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload schedule.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading project details..." />;
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/employer/projects')}>
          Back to Projects
        </Button>
        <Card className="p-6 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
          {error || 'Project not found.'}
        </Card>
      </div>
    );
  }

  const filteredSupervisors = availableSupervisors.filter((s: any) =>
    s.name.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
    (s.designation || '').toLowerCase().includes(supervisorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Top Header */}
      <div>
        <button
          onClick={() => navigate('/employer/projects')}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {project.code}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{project.name}</h1>
              <Badge variant={project.status === 'Completed' ? 'success' : project.status === 'Active' ? 'success' : project.status === 'Delayed' ? 'danger' : 'accent'}>
                {project.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Client: <strong className="text-slate-700">{project.client}</strong> • Location: <strong className="text-slate-700">{project.location}</strong>
            </p>
          </div>

          {/* PROJECT DETAILS HEADER ACTIONS */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Edit3}
              onClick={() => setEditProjectModalOpen(true)}
            >
              Edit Project
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/employer/projects/${id}/execution-plan`)}
            >
              Execution Plan Review
            </Button>

            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Delete Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project Access Code Card */}
      <Card className="p-4 bg-slate-900 text-white border-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">Worker Project Access Code</div>
          <p className="text-xs text-slate-300">Share this code with site supervisors to manage workers and field progress.</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-3.5 py-1.5 bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-cyan-300 rounded-lg tracking-wider">
            {project.project_access_code}
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Copy}
            onClick={handleCopyCode}
          >
            {copiedCode ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center space-x-6 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'activities' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>L5/L6 Schedule ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'team' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <UserCheck2 className="w-4 h-4" />
          <span>Supervisors ({projectSupervisors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'progress' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Progress Reports ({progressReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('images')}
          className={`py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'images' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Site Images ({siteImages.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Project Metadata</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Start Date</span>
                <span className="font-semibold text-slate-800">{project.start_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Target Completion</span>
                <span className="font-semibold text-slate-800">{project.target_completion}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Baseline Progress</span>
                <span className="font-semibold text-slate-800">{project.baseline_progress}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Actual Progress</span>
                <span className="font-extrabold text-blue-600">{project.actual_progress}%</span>
              </div>
            </div>

            {project.workflow_scope && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider mb-1">Project Workflow / Scope</span>
                <p className="text-xs text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {project.workflow_scope}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: L5/L6 SCHEDULE */}
      {activeTab === 'activities' && (
        <Card className="p-0 overflow-hidden border border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
            <span>L5/L6 Schedule Line Items</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/employer/projects/${id}/execution-plan`)}
            >
              Execution Plan Review
            </Button>
          </div>

          {activities.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No schedule activities generated yet"
              description="Review and generate execution plan from project description and workflow."
              action={
                <Button variant="primary" onClick={() => navigate(`/employer/projects/${id}/execution-plan`)}>
                  Generate / Review Execution Plan
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px]">
                    <th className="py-3 px-4">Activity ID</th>
                    <th className="py-3 px-4">L5 Work Package</th>
                    <th className="py-3 px-4">L6 Line Item</th>
                    <th className="py-3 px-4">Discipline</th>
                    <th className="py-3 px-4">Planned %</th>
                    <th className="py-3 px-4">Actual %</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activities.map((act) => (
                    <tr
                      key={act.id}
                      onClick={() => navigate(`/employer/activities/${act.activity_id}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600">{act.activity_id}</td>
                      <td className="py-3 px-4 font-medium text-slate-600">{act.l5_name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{act.name}</td>
                      <td className="py-3 px-4 text-slate-600">{act.discipline}</td>
                      <td className="py-3 px-4 text-slate-600">{act.planned_progress}%</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{act.actual_progress}%</td>
                      <td className="py-3 px-4">
                        <Badge variant={act.status === 'Completed' ? 'success' : act.status === 'Delayed' ? 'danger' : 'warning'} size="sm">
                          {act.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: TEAM / SUPERVISORS */}
      {activeTab === 'team' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Assigned Project Supervisors</h3>
              <p className="text-xs text-slate-500 font-medium">
                Supervisors oversee discipline field execution and manage worker daily tasks.
              </p>
            </div>
            <Button variant="primary" size="sm" icon={UserCheck} onClick={handleOpenAssignSupervisor}>
              Assign Supervisor
            </Button>
          </div>

          {projectSupervisors.length === 0 ? (
            <EmptyState
              icon={UserCheck2}
              title="No Supervisors Assigned"
              description="Assign discipline supervisors to manage workers and oversee day-wise execution."
              action={
                <Button variant="primary" icon={UserCheck} onClick={handleOpenAssignSupervisor}>
                  Assign Supervisor
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {projectSupervisors.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      {s.supervisor_name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{s.supervisor_name}</div>
                      <div className="text-[11px] text-slate-400">{s.supervisor_email}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant="info" size="sm">{s.discipline} Supervisor</Badge>
                    <span className="text-[10px] text-slate-400">Assigned: {s.assigned_at}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: PROGRESS REPORTS */}
      {activeTab === 'progress' && (
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900">Worker Daily Progress Submissions</h3>
          {progressReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Progress Reports"
              description="No worker progress reports submitted for this project yet."
            />
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {progressReports.map((r) => (
                <div key={r.id} className="py-3 flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900">{r.worker_name} — {r.activity_name} ({r.activity_code})</div>
                    <p className="text-slate-600 italic mt-0.5 font-medium">"{r.description}"</p>
                    <span className="text-[10px] text-slate-400">{r.report_date}</span>
                  </div>
                  <span className="font-bold text-emerald-600 text-sm">{r.progress_percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: SITE IMAGES */}
      {activeTab === 'images' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Uploaded Site Images</h3>
              <p className="text-xs text-slate-500 font-medium">Visual site photo evidence stored for this project.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => setUploadImageModalOpen(true)}
            >
              Upload Site Photo
            </Button>
          </div>

          {siteImages.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No Site Images Uploaded"
              description="Upload field site photos to track progress with visual analysis models."
              action={
                <Button
                  variant="primary"
                  icon={Upload}
                  onClick={() => setUploadImageModalOpen(true)}
                >
                  Upload Site Photo
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {siteImages.map((img) => (
                <div key={img.id} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs shadow-2xs">
                  <div className="relative rounded-lg overflow-hidden h-32 bg-slate-900 mb-2">
                    <img src={img.image_url} alt="Site photo" className="w-full h-full object-cover" />
                  </div>
                  <p className="font-bold text-slate-900 truncate">{img.description || 'Site Photo'}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{img.created_at || 'Recently uploaded'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Upload Image Modal */}
      <Modal
        isOpen={uploadImageModalOpen}
        onClose={() => setUploadImageModalOpen(false)}
        title="Upload Site Photo"
        subtitle={`Project: ${project?.name}`}
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!id || !uploadImageUrl) return;
            setIsUploadingImage(true);
            try {
              await api.uploadSiteImage({
                project_id: id,
                image_url: uploadImageUrl,
                description: uploadImageDesc || 'Field site photo'
              });
              setUploadImageModalOpen(false);
              setUploadImageUrl(null);
              setUploadImageDesc('');
              fetchProjectData();
            } catch (err: any) {
              alert(err.message || 'Failed to upload site photo.');
            } finally {
              setIsUploadingImage(false);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block text-slate-700 font-bold mb-1">Select / Capture Photo *</label>
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50 transition-colors">
              {uploadImageUrl ? (
                <div className="relative rounded-lg overflow-hidden max-h-48 bg-slate-950 mb-3 border border-slate-200">
                  <img src={uploadImageUrl} alt="Preview" className="w-full h-full object-cover max-h-48 mx-auto" />
                </div>
              ) : (
                <div className="py-4 space-y-1 text-slate-500 font-semibold">
                  <Camera className="w-8 h-8 text-blue-600 mx-auto" />
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
                      setUploadImageUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id="project-detail-photo-file-input"
              />
              <label
                htmlFor="project-detail-photo-file-input"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-2xs transition-colors"
              >
                {uploadImageUrl ? 'Change Selected Photo' : 'Choose Photo File'}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Photo Description / Notes</label>
            <input
              type="text"
              value={uploadImageDesc}
              onChange={(e) => setUploadImageDesc(e.target.value)}
              placeholder="e.g. Column C12 formwork installation inspection..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setUploadImageModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUploadingImage} disabled={!uploadImageUrl}>
              Upload Photo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={editProjectModalOpen}
        onClose={() => setEditProjectModalOpen(false)}
        title="Edit Project Details"
        subtitle={`Project Code: ${project.code}`}
        maxWidth="md"
      >
        <form onSubmit={handleEditProjectSubmit} className="space-y-4">
          <Input
            label="Project Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <Input
            label="Client Name"
            value={editClient}
            onChange={(e) => setEditClient(e.target.value)}
          />

          <Input
            label="Location"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
          />

          <div className="pt-2 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={() => setEditProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN SUPERVISOR MODAL */}
      <Modal
        isOpen={assignSupervisorModalOpen}
        onClose={() => setAssignSupervisorModalOpen(false)}
        title="ASSIGN SUPERVISOR"
        subtitle={`Assign a discipline supervisor to ${project.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleAssignSupervisorSubmit} className="space-y-4 text-xs">
          <Input
            icon={Search}
            placeholder="Search supervisor by name or email..."
            value={supervisorSearch}
            onChange={(e) => setSupervisorSearch(e.target.value)}
          />

          <div>
            <label className="block text-slate-700 font-bold mb-1">Supervisor Discipline</label>
            <Select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              options={[
                { value: 'Civil', label: 'Civil Construction' },
                { value: 'Electrical', label: 'Electrical Engineering' },
                { value: 'Piping', label: 'Piping & Mechanical' },
                { value: 'Structural', label: 'Heavy Lift / Structural' },
                { value: 'HSE', label: 'HSE Safety Audit' }
              ]}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Select Supervisor</label>
            {filteredSupervisors.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 font-medium">
                No supervisors found.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {filteredSupervisors.map((sup: any) => (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedSupervisorId(sup.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                      selectedSupervisorId === sup.id
                        ? 'border-blue-600 bg-blue-50/80 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{sup.name}</div>
                      <div className="text-[11px] text-slate-500">{sup.email} • {sup.designation || 'Supervisor'}</div>
                    </div>

                    <input
                      type="radio"
                      name="supervisor-select"
                      checked={selectedSupervisorId === sup.id}
                      onChange={() => setSelectedSupervisorId(sup.id)}
                      className="text-blue-600"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setAssignSupervisorModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAssigningSupervisor} disabled={!selectedSupervisorId}>
              Assign Supervisor
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Project?"
        subtitle={`Are you sure you want to delete "${project.name}"?`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl space-y-2 font-medium">
            <div className="flex items-center space-x-2 font-bold text-red-950 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>This action will permanently remove:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-700 font-medium">
              <li>Project information</li>
              <li>L5/L6 execution plan</li>
              <li>Day-wise tasks</li>
              <li>Supervisor assignments</li>
              <li>Progress records</li>
              <li>Reports</li>
              <li>Project images</li>
              <li>Project activity history</li>
            </ul>
            <p className="font-extrabold text-red-900 pt-1">This action cannot be undone.</p>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={handleConfirmDeleteProject}
              disabled={isDeletingProject}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              {isDeletingProject ? 'Deleting...' : 'Delete Project'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
