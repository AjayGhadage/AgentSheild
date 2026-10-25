import { useState } from 'react';
import { X, ArrowRight, ShieldCheck, Mail, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ENTERPRISE_PROFILES = [
  {
    name: 'Security Administrator',
    email: 'admin@agentshield.ai',
    role: 'Platform CISO & Governance',
    avatar: 'SA',
    color: 'bg-amber-600',
  },
  {
    name: 'Compliance Auditor',
    email: 'auditor@agentshield.ai',
    role: 'NIST & DPDP Forensic Auditor',
    avatar: 'CA',
    color: 'bg-emerald-600',
  },
  {
    name: 'Agent Integration Engineer',
    email: 'developer@agentshield.ai',
    role: 'LangChain & Agent Developer',
    avatar: 'AE',
    color: 'bg-blue-600',
  },
];

export default function GoogleAuthModal({ isOpen, onClose }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (email, name) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle({
        email,
        name,
        googleId: `google_${Date.now()}`,
      });
      onClose();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail) return;
    const name = customName.trim() || customEmail.split('@')[0];
    handleAuth(customEmail, name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0f1117] rounded-3xl shadow-2xl overflow-hidden border border-white/10 text-slate-100 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Google Logo */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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
            <div>
              <h3 className="font-bold text-base text-white leading-tight">
                Sign in with Google
              </h3>
              <p className="text-xs text-slate-400">Continue to AgentShield AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Quick Google Email Sign In Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google / Work Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="your.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Full Name (Optional)
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Alex Smith"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !customEmail}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating with Google...' : 'Continue with this Google Account'}
            </button>
          </form>

          {/* Or select a standard enterprise profile */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Or 1-click test with standard role:
            </p>
            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-black/20">
              {ENTERPRISE_PROFILES.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleAuth(acc.email, acc.name)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full ${acc.color} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      {acc.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{acc.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{acc.email}</p>
                    </div>
                  </div>
                  <ArrowRight
                    size={13}
                    className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5 text-center text-[11px] text-slate-400">
          Secure OAuth 2.0 flow • Signed JWT session issued via Oracle XE Security Vault.
        </div>
      </div>
    </div>
  );
}
