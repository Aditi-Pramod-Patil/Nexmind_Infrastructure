import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { KeyRound, Building2, MapPin, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectJoined?: (projectId: string) => void;
}

export function JoinProjectModal({ isOpen, onClose, onProjectJoined }: JoinProjectModalProps) {
  const [accessCode, setAccessCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const [previewProject, setPreviewProject] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetModal = () => {
    setAccessCode('');
    setStep(1);
    setPreviewProject(null);
    setError(null);
    setIsVerifying(false);
    setIsJoining(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setError(null);
    setIsVerifying(true);

    try {
      const preview = await api.previewProjectCode(accessCode.trim());
      if (preview.already_joined) {
        setError('You are already a member of this project.');
        return;
      }
      setPreviewProject(preview);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Invalid project code. Please check the code provided by your employer.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!accessCode.trim()) return;

    setError(null);
    setIsJoining(true);

    try {
      const joinedProj = await api.joinProject(accessCode.trim());
      const joinedId = joinedProj.id;
      resetModal();
      onClose();
      if (onProjectJoined) onProjectJoined(joinedId);
    } catch (err: any) {
      setError(err.message || 'Failed to join project.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { resetModal(); onClose(); }}
      title="Join a Project"
      subtitle="Enter the project access code provided by your employer."
      maxWidth="md"
    >
      {step === 1 ? (
        <form onSubmit={handleVerifyCode} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">Project Access Code *</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. CPM-A7K92X"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-extrabold text-blue-600 text-sm tracking-wider outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Case-insensitive. Your employer can find this code in their Project Details.</p>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => { resetModal(); onClose(); }}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !accessCode.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-2xs flex items-center space-x-1.5"
            >
              <span>{isVerifying ? 'Verifying Code...' : 'Verify Code'}</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Project Found</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
              <div className="font-extrabold text-[#0F172A] text-base">{previewProject.name}</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                <div>Client: <strong className="text-slate-800">{previewProject.client}</strong></div>
                <div>Location: <strong className="text-slate-800">{previewProject.location}</strong></div>
                <div>Project Code: <strong className="font-mono text-blue-600">{previewProject.code}</strong></div>
                <div>Status: <strong className="text-emerald-700">{previewProject.status}</strong></div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmJoin}
              disabled={isJoining}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs flex items-center space-x-1.5"
            >
              <span>{isJoining ? 'Joining Project...' : 'Confirm & Join Project'}</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
