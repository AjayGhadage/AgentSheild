import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Eye, EyeOff, Lock, Mail, User, CheckCircle2,
  AlertTriangle, ArrowRight, Sparkles, KeyRound
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GoogleAuthModal from '../components/GoogleAuthModal';
import RotatingParticleSphere from '../components/RotatingParticleSphere';

export default function Login() {
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [mode, setMode]                       = useState('login'); // 'login' | 'register'
  const [form, setForm]                       = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw]                   = useState(false);
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (role) => {
    if (role === 'admin') {
      setForm({ name: 'Administrator', email: 'admin@agentshield.ai', password: 'Admin@1234' });
    } else if (role === 'developer') {
      setForm({ name: 'Developer', email: 'developer@agentshield.ai', password: 'Developer@1234' });
    } else {
      setForm({ name: 'Auditor', email: 'reviewer@agentshield.ai', password: 'Reviewer@1234' });
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* ── FULLSCREEN 3D ROTATING PARTICLE SPHERE ANIMATION IN BACKGROUND ── */}
      <div className="absolute inset-0 flex items-center justify-center opacity-75 pointer-events-none z-0">
        <div className="w-[580px] h-[580px] sm:w-[750px] sm:h-[750px] lg:w-[900px] lg:h-[900px]">
          <RotatingParticleSphere
            size={800}
            particleCount={700}
            color="amber"
            showRings={true}
            interactive={true}
          />
        </div>
      </div>

      {/* Radiant Top Atmospheric Flare */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[340px] bg-gradient-to-b from-amber-500/20 via-amber-600/5 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

      {/* ── TOP MINIMAL BRAND HEADER ── */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
            <Shield size={16} strokeWidth={2.8} />
          </div>
          <span className="font-extrabold text-sm tracking-wider text-white">AGENTSHIELD</span>
        </Link>

        <Link
          to="/"
          className="text-xs text-slate-400 hover:text-amber-400 font-medium transition-colors"
        >
          ← Back to Homepage
        </Link>
      </header>

      {/* ── CENTER LOGIN/SIGNUP CARD ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-[#0e1017]/85 border border-white/10 rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur-2xl relative space-y-6">
          {/* Brand Shield & Tagline */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20">
              <Sparkles size={11} /> Autonomous Gateway
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'login'
                ? 'Sign in to access your agent protection console.'
                : 'Register a new account to deploy AI guardrails.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={() => setGoogleModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="bg-[#0e1017] px-3 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              or continue with email
            </span>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Mercer"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 pl-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Work / Enterprise Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 pl-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In with JWT' : 'Create Enterprise Account'}</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill (Generic, without personal names) */}
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <p className="text-[10px] font-mono uppercase text-slate-400 text-center">
              Quick demo tester credentials:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickDemo('admin')}
                className="py-1 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[10px] font-mono text-amber-300 truncate transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('auditor')}
                className="py-1 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[10px] font-mono text-emerald-300 truncate transition-colors"
              >
                Auditor
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('developer')}
                className="py-1 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[10px] font-mono text-blue-300 truncate transition-colors"
              >
                Developer
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── CLEAN BOTTOM FOOTER BAR ── */}
      <footer className="relative z-10 px-6 py-4 border-t border-white/5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} AgentShield AI • Protected by Oracle XE SHA-256 Vault & NIST AI Guidelines
      </footer>

      {/* Google OAuth Modal */}
      <GoogleAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
      />
    </div>
  );
}
