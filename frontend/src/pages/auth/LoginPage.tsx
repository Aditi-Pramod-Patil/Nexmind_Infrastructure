import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { Boxes, Building2, HardHat, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'employer' | 'worker'>('employer');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedUser = await login({ email: userEmail, password: userPass });
      if (loggedUser.role === 'employer') {
        navigate('/employer/dashboard');
      } else {
        navigate('/worker/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        const loggedUser = await login({ email, password });
        if (loggedUser.role === 'employer') {
          navigate('/employer/dashboard');
        } else {
          navigate('/worker/dashboard');
        }
      } else {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        const newUser = await register({ name, email, password, role });
        if (newUser.role === 'employer') {
          navigate('/employer/dashboard');
        } else {
          navigate('/worker/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold shadow-md mb-2">
          <Boxes className="w-7 h-7 text-amber-300" />
        </div>
        <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">InfraSync</h2>
        <p className="text-xs text-slate-500 font-medium">Enterprise Construction Progress & Schedule Platform</p>
      </div>

      {/* Main Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
          {/* Quick Demo Logins Box */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs">
            <span className="text-[11px] font-bold text-blue-900 uppercase block tracking-wider">Quick Single-Click Database Logins</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('aditi@example.com', 'password123')}
                className="p-2 bg-white hover:bg-slate-50 border border-blue-200 rounded-lg text-left font-semibold text-slate-800"
              >
                <div className="font-bold text-[#0F172A] text-[11px] flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Aditi Patil</span>
                </div>
                <div className="text-[10px] text-slate-500">Employer / PM</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rahul@example.com', 'password123')}
                className="p-2 bg-white hover:bg-slate-50 border border-emerald-200 rounded-lg text-left font-semibold text-slate-800"
              >
                <div className="font-bold text-[#0F172A] text-[11px] flex items-center space-x-1">
                  <HardHat className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rahul Sharma</span>
                </div>
                <div className="text-[10px] text-slate-500">Worker / Supervisor</div>
              </button>
            </div>
          </div>

          {/* Login / Register Tab Switches */}
          <div className="flex border-b border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(null); }}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                activeTab === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(null); }}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                activeTab === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login/Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {activeTab === 'register' && (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>
            </div>

            {activeTab === 'register' && (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('employer')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1.5 ${
                      role === 'employer' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Employer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('worker')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1.5 ${
                      role === 'worker' ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <HardHat className="w-4 h-4" />
                    <span>Worker</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold rounded-xl shadow-2xs flex items-center justify-center space-x-2 transition-all mt-2"
            >
              <span>{isSubmitting ? 'Authenticating...' : activeTab === 'login' ? 'Sign In to Dashboard' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
