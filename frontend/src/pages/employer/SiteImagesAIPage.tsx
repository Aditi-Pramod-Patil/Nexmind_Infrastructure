import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Camera, Sparkles, Eye, Loader2, Upload, CheckCircle2, RefreshCw, Zap, BarChart3 } from 'lucide-react';
import { api } from '../../services/api';

const ELEMENT_COLORS: Record<string, string> = {
  wall: 'bg-blue-100 text-blue-800 border-blue-200',
  brick: 'bg-orange-100 text-orange-800 border-orange-200',
  brickwork: 'bg-orange-100 text-orange-800 border-orange-200',
  masonry: 'bg-amber-100 text-amber-800 border-amber-200',
  rebar: 'bg-red-100 text-red-700 border-red-200',
  reinforcement: 'bg-red-100 text-red-700 border-red-200',
  formwork: 'bg-amber-100 text-amber-700 border-amber-200',
  shuttering: 'bg-amber-100 text-amber-700 border-amber-200',
  concrete: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  scaffold: 'bg-purple-100 text-purple-700 border-purple-200',
  scaffolding: 'bg-purple-100 text-purple-700 border-purple-200',
  pipe: 'bg-blue-100 text-blue-700 border-blue-200',
  spool: 'bg-blue-100 text-blue-700 border-blue-200',
  weld: 'bg-orange-100 text-orange-700 border-orange-200',
  crane: 'bg-slate-100 text-slate-700 border-slate-200',
  column: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  beam: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  pile: 'bg-teal-100 text-teal-700 border-teal-200',
  slab: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  worker: 'bg-sky-100 text-sky-700 border-sky-200',
  excavation: 'bg-stone-100 text-stone-700 border-stone-200',
};

const ELEMENT_ICONS: Record<string, string> = {
  wall: '🧱', brick: '🧱', brickwork: '🧱', masonry: '🧱', block: '🧱',
  rebar: '🔩', reinforcement: '🔩', formwork: '🪵', shuttering: '🪵',
  concrete: '🏗️', scaffold: '🪜', scaffolding: '🪜', pipe: '🔧',
  spool: '🔧', weld: '🔥', crane: '🏗️', column: '🏛️',
  beam: '🏛️', pile: '🪨', slab: '📐', worker: '👷', excavation: '⛏️',
};

export function SiteImagesAIPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [siteImages, setSiteImages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Analysis state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const [imgLoadError, setImgLoadError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setImgLoadError(false);
    try {
      const projs = (await api.getProjects()) as any[];
      setProjects(projs || []);
      if (projs && projs.length > 0) {
        const storedActiveId = localStorage.getItem('siteflow_active_project_id');
        const target = projs.find(p => p.id === storedActiveId || p.code === storedActiveId) || projs[0];
        const activeId = selectedProjectId || target.id;
        setSelectedProjectId(activeId);
        const imgs = (await api.getProjectSiteImages(activeId)) as any[];

        if (imgs && imgs.length > 0) {
          setSiteImages(imgs);
          setActiveImageIndex(0);
        } else {
          setSiteImages([]);
        }
      } else {
        setSiteImages([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedProjectId]);

  useEffect(() => {
    const handleProjectChanged = (e: any) => {
      if (e.detail) {
        setSelectedProjectId(e.detail);
      }
    };
    window.addEventListener('siteflow_project_changed', handleProjectChanged);
    return () => window.removeEventListener('siteflow_project_changed', handleProjectChanged);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
            setUploadImageUrl(compressed);
          } else {
            setUploadImageUrl(rawData);
          }
        };
        img.onerror = () => setUploadImageUrl(rawData);
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadImageUrl) return;
    setIsUploading(true);
    try {
      const targetProjId = selectedProjectId || (projects.length > 0 ? projects[0].id : null);
      await api.uploadSiteImage({
        project_id: targetProjId,
        image_url: uploadImageUrl,
        description: uploadDesc || 'Site photo for Smart analysis'
      });
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setUploadModalOpen(false);
        setUploadImageUrl(null);
        setUploadDesc('');
        loadData();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to upload site photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReanalyze = async (imageId: string) => {
    setAnalyzingId(imageId);
    try {
      await api.analyzeImageById(imageId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Analysis failed.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const activeImage = siteImages.length > 0 ? siteImages[activeImageIndex] : null;
  const detectedData = activeImage?.detected_elements;
  const elements = detectedData?.elements || [];
  const summary = detectedData?.summary || '';

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Site Image Smart Analysis</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Smart-powered construction progress detection using your trained Roboflow model.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {projects.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-2xs"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <Button variant="primary" size="sm" icon={Upload} onClick={() => setUploadModalOpen(true)}>
            Upload & Analyze
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span>Loading site images...</span>
        </div>
      ) : !activeImage ? (
        <Card className="p-12 text-center space-y-4 bg-white border border-dashed border-slate-300 rounded-2xl">
          <Camera className="w-12 h-12 text-blue-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-[#0F172A]">No Site Photos Uploaded Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Upload construction site photos — the analytics engine will detect rebar, formwork, concrete, and estimate progress.
            </p>
          </div>
          <Button variant="primary" icon={Upload} onClick={() => setUploadModalOpen(true)}>
            Upload Site Photo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Image Display */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-0 overflow-hidden border border-slate-200 shadow-2xs">
              <div className="p-4 bg-slate-100 text-slate-800 flex items-center justify-between text-xs border-b border-slate-200 font-bold">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Smart Construction Progress Analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={activeImage.ai_status === 'analyzed' ? 'success' : activeImage.ai_status === 'analyzing' ? 'warning' : 'neutral'}
                    size="sm"
                  >
                    {activeImage.ai_status === 'analyzed' ? '✅ Analyzed' : activeImage.ai_status === 'analyzing' ? '⏳ Processing...' : '⏸️ Pending'}
                  </Badge>
                  {activeImage.ai_confidence > 0 && (
                    <span className="text-emerald-700 font-extrabold">{activeImage.ai_confidence}% Confidence</span>
                  )}
                </div>
              </div>

              <div className="relative bg-slate-950 h-80 sm:h-96 w-full flex items-center justify-center overflow-hidden">
                <img src={activeImage.image_url} alt="Site inspection" className="w-full h-full object-cover" />
                {activeImage.ai_status === 'analyzing' && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
                      <p className="text-white font-bold text-sm">Running Smart Analysis...</p>
                      <p className="text-blue-300 text-xs">Detecting construction elements</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Thumbnail Strip */}
            {siteImages.length > 1 && (
              <div className="flex space-x-3 overflow-x-auto pb-1">
                {siteImages.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`flex-shrink-0 border-2 rounded-xl overflow-hidden cursor-pointer transition-all h-20 w-28 bg-slate-900 ${
                      idx === activeImageIndex ? 'border-blue-600 ring-2 ring-blue-200 scale-105' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={img.image_url} alt="Thumb" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Smart Results Panel */}
          <div className="lg:col-span-5 space-y-5">
            {/* Progress Estimate */}
            <Card className="border border-blue-200 bg-gradient-to-br from-blue-50/50 to-slate-50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-800">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Progress Estimate</span>
                </div>
                <button
                  onClick={() => handleReanalyze(activeImage.id)}
                  disabled={analyzingId === activeImage.id}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                >
                  {analyzingId === activeImage.id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Analyzing...</span></>
                  ) : (
                    <><RefreshCw className="w-3.5 h-3.5" /><span>Re-Analyze</span></>
                  )}
                </button>
              </div>

              <div className="flex items-end space-x-3">
                <span className="text-4xl font-extrabold text-slate-900">
                  {activeImage.ai_progress_estimate ?? 0}%
                </span>
                <span className="text-xs text-slate-500 font-semibold pb-1">estimated field progress</span>
              </div>

              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500"
                  style={{ width: `${Math.min(activeImage.ai_progress_estimate ?? 0, 100)}%` }}
                />
              </div>
            </Card>

            {/* Detected Elements */}
            <Card className="border border-emerald-200 bg-emerald-50/20 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Detected Construction Elements ({elements.length})</span>
              </div>

              {elements.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
                  {activeImage.ai_status === 'analyzed'
                    ? 'No construction elements detected in this image.'
                    : 'Upload or analyze an image to see detected elements.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {elements.map((elem: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${ELEMENT_COLORS[elem.class] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {ELEMENT_ICONS[elem.class] || '🔍'} {elem.label || elem.class}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {elem.count}x detected
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(elem.confidence * 100, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{Math.round(elem.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Smart Summary */}
            {summary && (
              <Card className="border border-slate-200 bg-white space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Smart Analysis Summary</span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {summary}
                </p>
              </Card>
            )}

            {/* Image Metadata */}
            <Card className="border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Image Details</div>
              <div className="text-xs space-y-1.5 text-slate-600 font-medium">
                <div>Description: <span className="font-bold text-slate-900">{activeImage.description || 'Site Photo'}</span></div>
                <div>Uploaded: <span className="font-bold text-slate-900">{activeImage.created_at || 'Recently'}</span></div>
                <div>Status: <Badge variant={activeImage.ai_status === 'analyzed' ? 'success' : 'warning'} size="sm">{activeImage.ai_status}</Badge></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Site Photo for Smart Analysis"
        subtitle="Your trained Roboflow model will detect construction elements and estimate progress"
        maxWidth="md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          {uploadSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Photo Uploaded & Smart Analysis Complete!</span>
            </div>
          ) : (
            <>
              {projects.length > 0 && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Select / Capture Photo *</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50 transition-colors">
                  {uploadImageUrl ? (
                    <div className="relative rounded-lg overflow-hidden max-h-48 bg-slate-950 mb-3 border border-slate-200">
                      <img src={uploadImageUrl} alt="Preview" className="w-full h-full object-cover max-h-48 mx-auto" />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600/90 backdrop-blur text-white text-[10px] font-bold rounded-full">
                        Ready for Analysis
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 space-y-1 text-slate-500 font-semibold">
                      <Camera className="w-8 h-8 text-blue-600 mx-auto" />
                      <div>Tap to pick photo or capture from camera</div>
                      <div className="text-[10px] text-slate-400">JPG, PNG, WEBP • Smart will auto-detect construction elements</div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                    id="employer-site-photo-file-input"
                  />
                  <label
                    htmlFor="employer-site-photo-file-input"
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
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="e.g. Pier P3 reinforcement cage installation progress..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] font-medium flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Your trained Roboflow model will automatically analyze this image for rebar, formwork, concrete, and other construction elements. Progress will be estimated and updated in real-time.</span>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isUploading} disabled={!uploadImageUrl}>
                  Upload & Run Smart Analysis
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
