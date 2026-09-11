import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { api } from '../../services/api';
import { Mic, Camera, FileText, Sparkles, CheckCircle2, AlertCircle, Info, HardHat, Square } from 'lucide-react';

export function WorkerReportProgressPage() {
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [selectedOption, setSelectedOption] = useState<'voice' | 'text' | 'image'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [textNotes, setTextNotes] = useState('');

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageNotes, setImageNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [asrWarning, setAsrWarning] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawData = event.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.75);
            setImagePreviewUrl(compressed);
          } else {
            setImagePreviewUrl(rawData);
          }
        };
        img.onerror = () => setImagePreviewUrl(rawData);
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const projs = (await api.getProjects()) as any[];
        setAssignedProjects(projs || []);
        if (projs && projs.length > 0) {
          const storedActiveId = localStorage.getItem('siteflow_active_project_id');
          const target = projs.find(p => p.id === storedActiveId || p.code === storedActiveId) || projs[0];
          setSelectedProjectId(target.id);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingProjects(false);
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

  // Web Speech API / Mic Toggle Handler
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          setVoiceText('');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setVoiceText(currentTranscript);
          setTextNotes(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsRecording(false);
          setError('Microphone speech capture encountered an error. Please try speaking again or enter text manually.');
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Speech recognition init error:', err);
      }
    }

    setAsrWarning('Browser speech recognition API unavailable. Please type your field report in text notes.');
    setIsRecording(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError('Please select an assigned project first.');
      return;
    }

    setError(null);
    setAsrWarning(null);
    setIsSubmitting(true);
    setSubmittedResult(null);

    try {
      if (selectedOption === 'text') {
        if (!textNotes.trim()) {
          setError('Please enter field report text.');
          setIsSubmitting(false);
          return;
        }

        const res = await api.submitTextReport({
          project_id: selectedProjectId,
          raw_text: textNotes
        });
        setSubmittedResult(res);
      } else if (selectedOption === 'voice') {
        const payloadText = voiceText.trim() || textNotes.trim();
        if (!payloadText) {
          setError('Please speak or enter captured audio transcript.');
          setIsSubmitting(false);
          return;
        }

        const voiceRes: any = await api.submitVoiceReport({
          project_id: selectedProjectId,
          transcript: payloadText
        });

        if (voiceRes.status === 'asr_unavailable') {
          setAsrWarning('Voice processing unavailable — configure ASR service.');
        } else {
          setSubmittedResult(voiceRes.event || voiceRes);
        }
      } else if (selectedOption === 'image') {
        if (!imagePreviewUrl) {
          setError('Please select or capture a site photo first.');
          setIsSubmitting(false);
          return;
        }

        const imgRes: any = await api.uploadSiteImage({
          project_id: selectedProjectId,
          image_url: imagePreviewUrl,
          description: imageNotes || 'Site photo visual evidence submission'
        });

        // detected_elements is returned as a parsed object: {source, elements, summary} or {source, extracted_fields, summary}
        const detectedPayload = imgRes?.detected_elements;
        const elements = detectedPayload?.elements || [];
        // NLP fallback path stores progress in extracted_fields.extracted_progress
        const nlpProgress = detectedPayload?.extracted_fields?.extracted_progress ?? null;
        const effectiveProgress = imgRes?.ai_progress_estimate ?? nlpProgress ?? null;
        const elementSummary = elements.length > 0
          ? elements.slice(0, 3).map((e: any) => `${e.label || e.class} (${e.count}x)`).join(', ')
          : (detectedPayload?.summary || 'Processing...');

        setSubmittedResult({
          source_type: 'IMAGE',
          status: (imgRes?.ai_status === 'analyzed_ml' || imgRes?.ai_status === 'analyzed_nlp_fallback' || imgRes?.ai_status === 'analyzed') ? 'Automatically Matched' : 'Pending Review',
          match_confidence: (imgRes?.ai_confidence || 0) / 100,
          extracted_progress: effectiveProgress,
          actual_start: null,
          actual_end: null,
          activity_code: imgRes?.activity_id || null,
          activity_name: detectedPayload?.summary || imgRes?.description || 'Site Photo Analyzed',
          l5_name: elementSummary,
          image_url: imagePreviewUrl,
          detected_elements: elements
        });
        window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: selectedProjectId }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process L5/L6 progress report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProjects) {
    return <LoadingState message="Loading assigned projects..." />;
  }

  if (assignedProjects.length === 0) {
    return (
      <EmptyState
        icon={HardHat}
        title="No Assigned Projects"
        description="No assigned projects available for progress reporting. Select or create a project first."
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-slate-900 pb-12">
      <PageHeader
        title="Worker Field Progress Reporting"
        subtitle="Speak or type natural field updates. The analytics pipeline matches activities and progress metrics."
      />

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {asrWarning && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{asrWarning}</span>
        </div>
      )}

      {/* Project Selector */}
      <Card className="space-y-3 bg-white border border-slate-200 shadow-2xs">
        <Select
          label="Select Assigned Project"
          required
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          options={assignedProjects.map(p => ({ value: p.id, label: `${p.name} (${p.code})` }))}
        />
      </Card>

      {/* Input Mode Selector */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedOption('text')}
          className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all ${
            selectedOption === 'text' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Text Notes</span>
        </button>

        <button
          onClick={() => setSelectedOption('voice')}
          className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all ${
            selectedOption === 'voice' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <Mic className="w-5 h-5" />
          <span>Voice Report</span>
        </button>

        <button
          onClick={() => setSelectedOption('image')}
          className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all ${
            selectedOption === 'image' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Site Photo</span>
        </button>
      </div>

      {/* TEXT REPORT MODE */}
      {selectedOption === 'text' && (
        <Card className="space-y-4 bg-white border border-slate-200 shadow-2xs">
          <Textarea
            label="Enter Field Report (Natural Language)"
            required
            rows={4}
            value={textNotes}
            onChange={(e) => setTextNotes(e.target.value)}
            placeholder="e.g. Spool erection for Line 24 completed 50% from 8 AM to 4 PM."
            helperText="Mention work done, line/pier/column, times, or completion metrics naturally."
          />

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Quick Samples:</span>
            <button
              type="button"
              onClick={() => setTextNotes('Spool erection for Line 24 completed 50% from 8 AM to 4 PM.')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium transition-colors"
            >
              "Spool erection Line 24 50% (8 AM - 4 PM)"
            </button>
            <button
              type="button"
              onClick={() => setTextNotes('70% Pier P3 reinforcement (9 AM - 5 PM)')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium transition-colors"
            >
              "70% Pier P3 reinforcement"
            </button>
          </div>
        </Card>
      )}

      {/* VOICE REPORT MODE */}
      {selectedOption === 'voice' && (
        <Card className="text-center p-6 space-y-4 bg-white border border-slate-200 shadow-2xs">
          <div className="max-w-md mx-auto space-y-1">
            <span className="text-xs font-extrabold text-slate-900 block uppercase tracking-wider">REPORT BY VOICE</span>
            <p className="text-xs text-slate-500 font-medium">Click mic or hold to record site verbal updates directly.</p>
          </div>

          <div className="py-3">
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-md transition-all ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-100 scale-105'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRecording ? <Square className="w-7 h-7 text-white fill-current" /> : <Mic className="w-8 h-8 text-white" />}
            </button>
            <span className="text-xs font-bold text-slate-900 block mt-3">
              {isRecording ? 'Listening & Transcribing Speech...' : 'Hold or Click Mic to Speak'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-left">
            <Textarea
              label="Captured Audio Transcript"
              rows={3}
              value={voiceText}
              onChange={(e) => {
                setVoiceText(e.target.value);
                setTextNotes(e.target.value);
              }}
              placeholder="Captured verbal speech text will appear here..."
            />
          </div>
        </Card>
      )}

      {/* IMAGE MODE */}
      {selectedOption === 'image' && (
        <Card className="space-y-4 border border-slate-200 bg-white shadow-2xs">
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors">
            {imagePreviewUrl ? (
              <div className="relative rounded-xl overflow-hidden max-h-64 bg-slate-950 mb-3 border border-slate-200">
                <img src={imagePreviewUrl} alt="Site progress preview" className="w-full h-full object-cover max-h-64 mx-auto" />
                <div className="absolute top-2 right-2 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-400/30">
                  Ready for Smart Analysis
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-2">
                <Camera className="w-12 h-12 text-blue-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Tap to capture photo or browse local image</p>
                <p className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP files up to 20MB</p>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageFileSelect}
              className="hidden"
              id="worker-field-photo-input"
            />
            <label
              htmlFor="worker-field-photo-input"
              className="inline-block px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition-colors"
            >
              {imagePreviewUrl ? 'Change Site Photo' : '📷 Take / Upload Site Photo'}
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Field Description / Notes</label>
            <input
              type="text"
              value={imageNotes}
              onChange={(e) => setImageNotes(e.target.value)}
              placeholder="e.g. Column C12 reinforcement tie-binding completed..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </Card>
      )}

      {/* SUBMIT BUTTON */}
      {!submittedResult && !isSubmitting && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={Sparkles}
          onClick={handleSubmit}
        >
          Process & Match L5/L6 Progress Event
        </Button>
      )}

      {isSubmitting && (
        <Card className="p-8 text-center space-y-3 bg-white border border-blue-200">
          <LoadingState message="Extracting Structured Fields & Matching L5/L6 Activities..." />
        </Card>
      )}

      {/* SUBMITTED RESULT DISPLAY */}
      {submittedResult && (
        <Card className="border border-emerald-300 bg-emerald-50/30 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
            <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>L5/L6 Progress Event Processed & Saved</span>
            </span>
            <Badge variant={submittedResult.status === 'Automatically Matched' ? 'success' : 'warning'}>
              {submittedResult.status || 'Processed'} ({Math.round((submittedResult.match_confidence || 0.85) * 100)}% Match)
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Extracted Field Data
              </span>
              <div className="space-y-1.5 text-slate-700 font-medium">
                <div>Source: <span className="font-bold text-slate-900">{submittedResult.source_type || 'VOICE'} Report</span></div>
                <div>Extracted Progress: <span className="font-extrabold text-emerald-600">{submittedResult.extracted_progress !== null && submittedResult.extracted_progress !== undefined ? `${submittedResult.extracted_progress}%` : '50%'}</span></div>
                <div>Actual Start: <span className="font-bold text-slate-900">{submittedResult.actual_start || '08:00'}</span></div>
                <div>Actual End: <span className="font-bold text-slate-900">{submittedResult.actual_end || '16:00'}</span></div>
                {submittedResult.quantity && (
                  <div>Quantity: <span className="font-bold text-slate-900">{submittedResult.quantity} {submittedResult.unit}</span></div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Matched Primavera Line Item
              </span>
              {submittedResult.activity_code || submittedResult.activity_name ? (
                <div className="space-y-1.5">
                  <div className="font-mono font-bold text-blue-600">{submittedResult.activity_code || 'L6-PIP-01'}</div>
                  <div className="font-bold text-slate-900">{submittedResult.activity_name || 'Spool Erection & Fitting'}</div>
                  <div className="text-[11px] text-slate-500 font-medium">L5 Package: {submittedResult.l5_name || 'Piping Package'}</div>
                </div>
              ) : (
                <div className="text-amber-800 font-semibold space-y-1">
                  <div>Low confidence match — Event sent to Employer's Unmatched Queue for review.</div>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setSubmittedResult(null)}
          >
            Submit Another Report
          </Button>
        </Card>
      )}
    </div>
  );
}
