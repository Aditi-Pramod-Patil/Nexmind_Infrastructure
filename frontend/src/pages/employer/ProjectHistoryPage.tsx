import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import {
  History,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Database,
  ShieldCheck,
  BarChart3,
  BookOpen,
  X,
  FileText,
  TrendingUp,
  Building2,
  Brain
} from 'lucide-react';

export function ProjectHistoryPage() {
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'archived' | 'audit'>('benchmarks');
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // New Benchmark Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    project_category: 'Civil & Heavy Substructure',
    activity_type: '',
    baseline_days: '',
    average_days: '',
    projects_analyzed_count: '1',
    top_delay_causes: '',
    ai_insight: ''
  });

  useEffect(() => {
    loadAllHistoryData();
  }, []);

  async function loadAllHistoryData() {
    setLoading(true);
    try {
      const [bData, aData, logData] = await Promise.all([
        api.getHistoryBenchmarks().catch(() => []),
        api.getArchivedProjects().catch(() => []),
        api.getAuditLogs().catch(() => [])
      ]);
      setBenchmarks(bData || []);
      setArchivedProjects(aData || []);
      setAuditLogs(logData || []);
    } catch (err) {
      console.error('Failed to load history records:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity_type.trim() || !formData.baseline_days || !formData.average_days) return;

    setIsSubmitting(true);
    try {
      const causes = formData.top_delay_causes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const newRecord = await api.addHistoryBenchmark({
        project_category: formData.project_category,
        activity_type: formData.activity_type,
        baseline_days: parseFloat(formData.baseline_days),
        average_days: parseFloat(formData.average_days),
        projects_analyzed_count: parseInt(formData.projects_analyzed_count) || 1,
        top_delay_causes: causes,
        ai_insight: formData.ai_insight || `Retrospective benchmark logged for ${formData.activity_type}.`
      });

      setBenchmarks((prev) => [newRecord, ...prev]);
      setIsModalOpen(false);
      setFormData({
        project_category: 'Civil & Heavy Substructure',
        activity_type: '',
        baseline_days: '',
        average_days: '',
        projects_analyzed_count: '1',
        top_delay_causes: '',
        ai_insight: ''
      });
    } catch (err) {
      console.error('Failed to create benchmark:', err);
      alert('Error creating historical benchmark record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter benchmarks
  const filteredBenchmarks = benchmarks.filter((b) => {
    const matchesSearch =
      b.activity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.project_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.ai_insight && b.ai_insight.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' ||
      b.project_category.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Calculate Statistics
  const totalBenchmarks = benchmarks.length;
  const totalArchived = archivedProjects.length;

  const avgVariance = totalBenchmarks > 0
    ? (
        benchmarks.reduce((acc, b) => {
          const varPct = ((b.average_days - b.baseline_days) / Math.max(b.baseline_days, 0.1)) * 100;
          return acc + varPct;
        }, 0) / totalBenchmarks
      ).toFixed(1)
    : '0.0';

  const allDelayCausesCount = benchmarks.reduce((acc, b) => acc + (b.top_delay_causes?.length || 0), 0);

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] p-6 rounded-2xl text-white shadow-md border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <History className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Project History & Institutional Memory</h1>
          </div>
          <p className="text-xs text-slate-300 mt-2 font-medium max-w-2xl">
            Historical execution intelligence repository preserving actual vs baseline durations, finished project archives, and system audit logs to eliminate recurring schedule planning errors.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all border border-blue-400/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Retrospective Benchmark</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-600 bg-white space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Execution Benchmarks</span>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-[#0F172A]">{totalBenchmarks}</div>
          <p className="text-[11px] text-slate-500 font-medium">Activity types analyzed across past sites</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 bg-white space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Avg Duration Variance</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">+{avgVariance}%</div>
          <p className="text-[11px] text-slate-500 font-medium">Historical overrun over baseline estimates</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 bg-white space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Archived Projects</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#0F172A]">{totalArchived}</div>
          <p className="text-[11px] text-slate-500 font-medium">Completed & handed-over infrastructure contracts</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-600 bg-white space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Root Causes Cataloged</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-[#0F172A]">{allDelayCausesCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Specific bottleneck factors preserved</p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`py-4 text-xs font-extrabold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'benchmarks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Activity Execution Benchmarks</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]">
              {benchmarks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`py-4 text-xs font-extrabold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'archived'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Completed Project Archives</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px]">
              {archivedProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 text-xs font-extrabold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>System Audit & Activity Trail</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px]">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-3 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span>Loading historical execution intelligence repository...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: Activity Execution Benchmarks */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search benchmarks, piping, piling..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Piping">Piping & Mechanical</option>
                    <option value="Civil">Civil & Substructure</option>
                    <option value="Concrete">Structural Concrete</option>
                    <option value="Electrical">Electrical & Substation</option>
                  </select>
                </div>
              </div>

              {filteredBenchmarks.length === 0 ? (
                <Card className="p-12 text-center space-y-3 bg-white border border-dashed border-slate-300">
                  <History className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-[#0F172A]">No Matching Execution Benchmarks Found</h3>
                  <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                    No historical records match your search criteria. Try clearing filters or add a new retrospective benchmark.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBenchmarks.map((b) => {
                    const variancePct = (
                      ((b.average_days - b.baseline_days) / Math.max(b.baseline_days, 0.1)) *
                      100
                    ).toFixed(1);

                    const isOver = b.average_days > b.baseline_days;

                    return (
                      <Card key={b.id} className="p-5 bg-white border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-wider">
                              {b.project_category}
                            </span>
                            <h3 className="text-sm font-extrabold text-[#0F172A] mt-1.5">{b.activity_type}</h3>
                          </div>
                          <Badge variant={isOver ? 'warning' : 'success'} size="sm">
                            {isOver ? `+${variancePct}% Overrun` : 'On Target'}
                          </Badge>
                        </div>

                        {/* Baseline vs Actual Duration Bar */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-600">Baseline Duration:</span>
                            <span className="text-slate-900 font-extrabold">{b.baseline_days} days</span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-600">Actual Historical Avg:</span>
                            <span className={`font-extrabold ${isOver ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {b.average_days} days
                            </span>
                          </div>

                          {/* Visual progress comparison */}
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                            <div
                              className="bg-blue-600 h-full rounded-l"
                              style={{ width: `${Math.min(100, (b.baseline_days / Math.max(b.average_days, b.baseline_days)) * 100)}%` }}
                              title="Baseline share"
                            ></div>
                            {isOver && (
                              <div
                                className="bg-amber-500 h-full rounded-r"
                                style={{ width: `${Math.min(100, ((b.average_days - b.baseline_days) / b.average_days) * 100)}%` }}
                                title="Variance overrun share"
                              ></div>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 text-right font-medium">
                            Sample Size: {b.projects_analyzed_count} projects analyzed
                          </div>
                        </div>

                        {/* Top Delay Causes Tags */}
                        {b.top_delay_causes && b.top_delay_causes.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-600 block">Top Delay Causes:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {b.top_delay_causes.map((cause: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md"
                                >
                                  • {cause}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Execution Insight */}
                        {b.ai_insight && (
                          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs space-y-1">
                            <div className="flex items-center space-x-1.5 font-bold text-blue-900">
                              <Brain className="w-4 h-4 text-blue-600" />
                              <span>Institutional Intelligence Insight</span>
                            </div>
                            <p className="text-[11px] text-blue-900/80 leading-relaxed font-medium">
                              "{b.ai_insight}"
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Completed Project Archives */}
          {activeTab === 'archived' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-extrabold text-[#0F172A]">Finished & Handed Over Infrastructure Projects</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical database of completed capital projects preserving planned vs actual timelines and schedule performance index (SPI).
                </p>
              </div>

              <div className="space-y-4">
                {archivedProjects.map((proj) => (
                  <Card key={proj.id} className="p-6 bg-white border border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            {proj.code}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">• {proj.project_type}</span>
                        </div>
                        <h2 className="text-base font-black text-[#0F172A] mt-1">{proj.name}</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Client: {proj.client} • Location: {proj.location}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">SPI Index</span>
                          <span className={`text-base font-black ${proj.spi_index >= 1.0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {proj.spi_index}
                          </span>
                        </div>
                        <Badge variant={proj.spi_index >= 1.0 ? 'success' : 'warning'} size="md">
                          {proj.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 font-bold block text-[11px]">Planned vs Actual Duration</span>
                        <span className="font-extrabold text-slate-900 mt-0.5 block">
                          {proj.planned_duration_days} days planned → {proj.actual_duration_days} days actual
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block text-[11px]">Completion Timeline</span>
                        <span className="font-extrabold text-slate-900 mt-0.5 block">
                          Target: {proj.baseline_completion_date} → Handover: {proj.actual_completion_date}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block text-[11px]">Cost Variance</span>
                        <span className="font-extrabold text-slate-900 mt-0.5 block">
                          {proj.overall_cost_variance}
                        </span>
                      </div>
                    </div>

                    {proj.key_lessons_learned && proj.key_lessons_learned.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-extrabold text-[#0F172A] flex items-center space-x-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span>Key Lessons Learned & Retrospectives</span>
                        </span>
                        <ul className="space-y-1 text-xs text-slate-600 pl-5 list-disc font-medium">
                          {proj.key_lessons_learned.map((lesson: string, i: number) => (
                            <li key={i}>{lesson}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: System Audit & Activity Trail */}
          {activeTab === 'audit' && (
            <Card className="p-0 overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-[#0F172A]">
                <span>System Event Log & Execution Audit Trail</span>
                <span className="text-slate-500 font-normal text-[11px]">Showing recent 50 audit entries</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">No audit logs recorded yet.</div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                          <span className="font-bold text-[#0F172A]">{log.user_name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium pl-1">{log.details}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Retrospective Benchmark Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">Log Historical Execution Benchmark</h3>
                <p className="text-xs text-slate-500 mt-0.5">Record activity actuals to refine future baseline calculations.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBenchmark} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Category / Discipline</label>
                <select
                  value={formData.project_category}
                  onChange={(e) => setFormData({ ...formData, project_category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="Civil & Heavy Substructure">Civil & Heavy Substructure</option>
                  <option value="Heavy Piping & Mechanical Infrastructure">Heavy Piping & Mechanical Infrastructure</option>
                  <option value="Structural Concrete & Superstructure">Structural Concrete & Superstructure</option>
                  <option value="Electrical & Substation Installation">Electrical & Substation Installation</option>
                  <option value="General Infrastructure">General Infrastructure</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Activity Type / Work Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.activity_type}
                  onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                  placeholder="e.g. Column Reinforcement Pouring"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Baseline Days *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.baseline_days}
                    onChange={(e) => setFormData({ ...formData, baseline_days: e.target.value })}
                    placeholder="3.0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Actual Avg Days *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.average_days}
                    onChange={(e) => setFormData({ ...formData, average_days: e.target.value })}
                    placeholder="4.5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Projects Count</label>
                  <input
                    type="number"
                    value={formData.projects_analyzed_count}
                    onChange={(e) => setFormData({ ...formData, projects_analyzed_count: e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Top Delay Causes (comma separated)</label>
                <input
                  type="text"
                  value={formData.top_delay_causes}
                  onChange={(e) => setFormData({ ...formData, top_delay_causes: e.target.value })}
                  placeholder="Material delay, Crane access clash, Rebar re-inspection"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Intelligence Lesson / Retrospective Note</label>
                <textarea
                  rows={3}
                  value={formData.ai_insight}
                  onChange={(e) => setFormData({ ...formData, ai_insight: e.target.value })}
                  placeholder="Summarize the core execution takeaway from past project experience..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center space-x-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Benchmark</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
