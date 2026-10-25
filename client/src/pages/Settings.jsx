import { useState } from 'react';
import { Settings, User, Database, Key, Bell, Save, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#0e1017] border border-white/10 rounded-2xl p-5 mb-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        <Icon size={16} className="text-amber-400 shrink-0" />
        <h2 className="font-bold text-white text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-xs sm:text-sm text-slate-200 font-medium">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 ${
          value ? 'bg-amber-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-slate-950 shadow transition-transform ${
            value ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [prefs, setPrefs] = useState({
    emailAlerts:         true,
    highRiskAlerts:      true,
    approvalAlerts:      true,
    incidentAlerts:      false,
    auditRetentionDays:  90,
    maxRiskThreshold:    59,
    autoBlockCritical:   true,
    requireApprovalAbove: 30,
    nebiusApiKey:        '',
    nebiusModel:         'nvidia/llama-3.1-nemotron-70b-instruct',
    nebiusBaseUrl:       'https://api.studio.nebius.ai/v1',
  });

  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6 text-slate-100">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white mb-1 flex items-center gap-2">
          <Settings size={22} className="text-amber-400" /> Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Configure AgentShield gateway preferences, automated alerting thresholds, and NVIDIA model credentials.
        </p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Authenticated Account Profile">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Display Name</label>
            <input className="input" defaultValue={user?.name || 'Administrator'} readOnly />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Account Email</label>
            <input className="input" defaultValue={user?.email || 'admin@agentshield.ai'} readOnly />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Assigned Role</label>
            <input className="input font-mono text-amber-400" defaultValue={user?.role || 'admin'} readOnly />
          </div>
        </div>
      </Section>

      {/* Nemotron AI */}
      <Section icon={Key} title="AI Engine — NVIDIA Nemotron">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Nebius API Key</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showKey ? 'text' : 'password'}
                placeholder="ey…or paste your Nebius API token"
                value={prefs.nebiusApiKey}
                onChange={e => set('nebiusApiKey', e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setShowKey(v => !v)}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Configure in <code className="bg-white/5 text-amber-300 px-1.5 py-0.5 rounded border border-white/5">server/.env</code> as <code className="bg-white/5 text-amber-300 px-1.5 py-0.5 rounded border border-white/5">NEBIUS_API_KEY</code>.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Model Architecture</label>
            <select
              className="input"
              value={prefs.nebiusModel}
              onChange={e => set('nebiusModel', e.target.value)}
            >
              <option value="nvidia/llama-3.1-nemotron-70b-instruct">nvidia/llama-3.1-nemotron-70b-instruct (Ultra Reasoning)</option>
              <option value="nvidia/llama-3.1-nemotron-nano-8b-instruct">nvidia/llama-3.1-nemotron-nano-8b-instruct (Fast Everyday)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Inference Base URL</label>
            <input className="input" value={prefs.nebiusBaseUrl} onChange={e => set('nebiusBaseUrl', e.target.value)} />
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200">
            ℹ️ AgentShield uses instant local fallback evaluation when no active cloud API key is configured.
          </div>
        </div>
      </Section>

      {/* Enforcement */}
      <Section icon={Database} title="Enforcement Thresholds">
        <div className="space-y-2 divide-y divide-white/5">
          <ToggleRow
            label="Auto-block critical threats"
            sub="Risk score ≥ 80 is immediately denied regardless of agent role"
            value={prefs.autoBlockCritical}
            onChange={v => set('autoBlockCritical', v)}
          />
          <div className="py-2.5">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Global Max Risk Threshold (0–100)</label>
            <input
              type="number"
              min="0"
              max="100"
              className="input w-36"
              value={prefs.maxRiskThreshold}
              onChange={e => set('maxRiskThreshold', Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-500 mt-1">Actions scoring above this threshold are blocked pre-execution.</p>
          </div>
          <div className="py-2.5">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Require Human Approval Above Score</label>
            <input
              type="number"
              min="0"
              max="100"
              className="input w-36"
              value={prefs.requireApprovalAbove}
              onChange={e => set('requireApprovalAbove', Number(e.target.value))}
            />
          </div>
          <div className="py-2.5">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Oracle XE Audit Retention (Days)</label>
            <input
              type="number"
              min="7"
              max="3650"
              className="input w-36"
              value={prefs.auditRetentionDays}
              onChange={e => set('auditRetentionDays', Number(e.target.value))}
            />
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Alerts & Notification Feeds">
        <div className="divide-y divide-white/5">
          <ToggleRow label="Email alerts" sub="Receive critical security notices at account email" value={prefs.emailAlerts} onChange={v => set('emailAlerts', v)} />
          <ToggleRow label="High-risk action alerts" sub="Real-time alert on actions scoring ≥ 60" value={prefs.highRiskAlerts} onChange={v => set('highRiskAlerts', v)} />
          <ToggleRow label="Pending approval alerts" sub="Notify reviewers when human confirmation is required" value={prefs.approvalAlerts} onChange={v => set('approvalAlerts', v)} />
          <ToggleRow label="Security incident alerts" sub="Notify security operations on quarantine events" value={prefs.incidentAlerts} onChange={v => set('incidentAlerts', v)} />
        </div>
      </Section>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-2">
        <button
          className="btn-primary flex items-center gap-2"
          onClick={save}
          disabled={saving}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle size={15} /> Preferences saved successfully!
          </span>
        )}
      </div>
    </div>
  );
}
