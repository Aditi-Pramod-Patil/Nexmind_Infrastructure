import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Brain,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Mic,
  Camera,
  LineChart,
  ChevronRight,
  CheckCircle2,
  Building2,
  Boxes,
  Users,
  BarChart3,
  Search,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';
import { Hero3D } from '../components/common/Hero3D';

export function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Sticky Enterprise Header (Light Formal) */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-2xs border-b border-slate-200 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Boxes className="w-5 h-5 text-amber-300" />
            </div>
            <span className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              Infra<span className="text-blue-600">Sync</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-600">
            <a href="#capabilities" className="hover:text-blue-600 transition-colors">Capabilities</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#l5-l6" className="hover:text-blue-600 transition-colors">L5/L6 Intelligence</a>
            <a href="#workflows" className="hover:text-blue-600 transition-colors">Workflows</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link to="/login" className="text-xs font-bold px-4 py-2 text-slate-700 hover:text-blue-600">
              Sign In
            </Link>
            <Link
              to="/login"
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION WITH RICH AMBIENT BACKGROUND ANIMATIONS */}
      <section className="relative pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Background Ambient Glowing Orbs */}
        <div className="absolute top-10 -left-20 w-[450px] h-[450px] bg-blue-500/12 rounded-full blur-[120px] pointer-events-none animate-blob-1" />
        <div className="absolute top-1/4 -right-20 w-[520px] h-[520px] bg-indigo-500/14 rounded-full blur-[130px] pointer-events-none animate-blob-2" />
        <div className="absolute -bottom-10 left-1/3 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[110px] pointer-events-none animate-pulse-slow" />

        {/* Tech Dot Grid Pattern Layer */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:32px_32px] opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)] pointer-events-none" />

        {/* Floating Tech Badges in Background Layer */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 text-[10px] font-bold text-slate-600 shadow-sm animate-float-badge absolute top-20 right-10 z-0 pointer-events-none">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Primavera P6 Live Sync Active</span>
        </div>

        <div
          className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 text-[10px] font-bold text-emerald-700 shadow-sm animate-float-badge absolute bottom-12 left-4 z-0 pointer-events-none"
          style={{ animationDelay: '2.5s' }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>WBS L1-L6 Automated Mapping</span>
        </div>

        {/* Main Grid Content */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            
            {/* Feature Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-blue-200/90 text-blue-700 text-xs font-bold shadow-xs transition-all hover:border-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Primavera P6 Sync & L5/L6 Schedule Reconciliation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-r from-slate-900 via-blue-950 to-blue-600 bg-clip-text text-transparent">
                Automated Construction Progress Intelligence
              </span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed font-semibold">
              “Synchronizing Infrastructure from Plan to Progress.”
            </p>

            {/* Metric Pills */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300/90 transition-all duration-300 hover:-translate-y-0.5 space-y-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">99.4%</span>
                <span className="text-xs text-slate-500 font-semibold block">Baseline Sync Confidence</span>
              </div>

              <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300/90 transition-all duration-300 hover:-translate-y-0.5 space-y-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">L1 ➔ L6</span>
                <span className="text-xs text-slate-500 font-semibold block">Deep WBS Hierarchy</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md hover:shadow-blue-500/10 hover:scale-[1.02] transition-all"
              >
                <span>Get Started Platform</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>

              <a
                href="#capabilities"
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200/90 shadow-2xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
              >
                <span>View Platform Features</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <Hero3D />
          </div>
        </div>
      </section>

      {/* 2. PLATFORM CAPABILITIES */}
      <section id="capabilities" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-blue-600 mb-1">SECTION 2</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Platform Capabilities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200">
              <BarChart3 className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-base font-bold text-[#0F172A] mb-2">Primavera Baseline Sync</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Imports CSV, XLSX, and Primavera P6 .XER exports down to L5 packages and L6 field line items.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200">
              <Camera className="w-8 h-8 text-emerald-600 mb-4" />
              <h3 className="text-base font-bold text-[#0F172A] mb-2">Smart Vision Segmentation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Computer vision models detect installed rebar, formwork, and concrete progress percentages from site photos.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200">
              <LineChart className="w-8 h-8 text-amber-600 mb-4" />
              <h3 className="text-base font-bold text-[#0F172A] mb-2">Predictive Risk Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculates velocity deltas and flags critical path delays weeks before milestone failures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-blue-600 mb-1">SECTION 3</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">How It Works</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Site Data Input', desc: 'Voice, photo & text field logs' },
            { step: '2', title: 'Smart Entity Parsing', desc: 'Semantic NLP & object segmentation' },
            { step: '3', title: 'L5/L6 Reconciliation', desc: 'Automatic link to Primavera activity' },
            { step: '4', title: 'Verified Intelligence', desc: 'Multimodal progress verification' },
          ].map((st, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Step 0{st.step}
              </span>
              <h4 className="font-bold text-sm text-[#0F172A]">{st.title}</h4>
              <p className="text-xs text-slate-500">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Smart-POWERED PROGRESS MONITORING (Light Formal Container) */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-blue-600 mb-1">SECTION 4</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Automated Progress Monitoring</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-[#F8FAFC] rounded-2xl border border-slate-200 space-y-3">
              <Mic className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-[#0F172A]">Voice Time Agent</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supervisors hold-to-speak in natural spoken Hindi/English. The NLP engine parses location and progress percentage into structured schedule updates.
              </p>
            </div>

            <div className="p-6 bg-[#F8FAFC] rounded-2xl border border-slate-200 space-y-3">
              <Camera className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-bold text-[#0F172A]">Visual Evidence Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Photos are cross-checked against supervisor claims to generate Smart-weighted progress confidence scores before Primavera baseline auto-update.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. L5/L6 ACTIVITY INTELLIGENCE */}
      <section id="l5-l6" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-blue-600 mb-1">SECTION 5</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">L5/L6 Activity Intelligence</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-3xl mx-auto space-y-3 text-xs">
          <div className="font-mono font-bold text-blue-600">L1: Pune Industrial Expansion</div>
          <div className="pl-4 font-semibold text-slate-700">└── L2: Civil & Structural Works</div>
          <div className="pl-8 font-semibold text-slate-700">└── L3: Foundation Substructure</div>
          <div className="pl-12 font-semibold text-slate-700">└── L4: Block A Area</div>
          <div className="pl-16 font-bold text-[#0F172A]">└── L5: Concrete Structure (CIV-L5-01)</div>
          <div className="pl-20 font-bold text-blue-700">├── L6: Column Reinforcement (CIV-034) — 64% Actual vs 72% Planned</div>
          <div className="pl-20 font-bold text-slate-600">├── L6: Beam Reinforcement (CIV-035) — 75% Actual vs 80% Planned</div>
          <div className="pl-20 font-bold text-slate-600">└── L6: Slab Reinforcement (CIV-036) — 40% Actual vs 40% Planned</div>
        </div>
      </section>

      {/* 6. EMPLOYER VS WORKER WORKFLOW */}
      <section id="workflows" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-blue-600 mb-1">SECTION 6</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Employer vs Worker Workflows</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl border border-slate-200 bg-[#F8FAFC] space-y-3">
              <Building2 className="w-8 h-8 text-[#0F172A]" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Employer / PM Workflow</h3>
              <p className="text-xs text-slate-600">Project setup, Primavera schedule upload, L5/L6 variance tracking, match review, delay risk predictions & executive reports.</p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-[#F8FAFC] space-y-3">
              <Users className="w-8 h-8 text-emerald-700" />
              <h3 className="text-lg font-extrabold text-[#0F172A]">Worker / Site Supervisor Workflow</h3>
              <p className="text-xs text-slate-600">Today's activities list, low-friction voice progress reporting, site photo evidence uploads & submission history.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="py-16 bg-[#0F172A] text-white text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl font-extrabold">Ready to Transform Site Progress Intelligence?</h2>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg inline-flex items-center space-x-2 transition-all hover:scale-105"
          >
            <span>Launch Platform Now</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-white text-slate-500 py-8 border-t border-slate-200 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-[#0F172A]">InfraSync</span>
            <span>| Synchronizing Infrastructure from Plan to Progress.</span>
          </div>
          <div>© 2026 InfraSync. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
