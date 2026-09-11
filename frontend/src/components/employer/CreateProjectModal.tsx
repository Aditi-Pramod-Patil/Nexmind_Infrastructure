import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: any) => void;
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [targetCompletion, setTargetCompletion] = useState('2027-06-30');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCode('');
    setName('');
    setClient('');
    setLocation('');
    setDescription('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }

    if (!code.trim()) {
      setError('Project Code is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const createdProject: any = await api.createProject({
        code: code.trim(),
        name: name.trim(),
        client: client.trim(),
        location: location.trim(),
        start_date: startDate,
        target_completion: targetCompletion,
        description: description.trim()
      });

      if (createdProject?.id) {
        localStorage.setItem('siteflow_active_project_id', createdProject.id);
      }

      resetForm();
      onClose();

      if (onProjectCreated) {
        onProjectCreated(createdProject);
      } else if (createdProject?.id) {
        navigate(`/employer/projects/${createdProject.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Project"
      subtitle="Define project metadata & baseline schedule configuration"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Project Name"
            required
            placeholder="RiverLink Bridge Construction"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Project Code"
            required
            placeholder="PRJ-RIVER-01"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-blue-600 font-semibold"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Client Name"
            placeholder="National Highway Authority"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          />

          <Input
            label="Location"
            placeholder="Pune, Maharashtra"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="Planned End Date"
            type="date"
            value={targetCompletion}
            onChange={(e) => setTargetCompletion(e.target.value)}
          />
        </div>

        <Textarea
          label="Project Description"
          rows={3}
          placeholder="Brief scope summary..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
          >
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
