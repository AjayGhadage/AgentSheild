import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Plus, Loader2, RefreshCw, Shield, Lock, Clock, Zap, Trash2 } from 'lucide-react';
import api from '../services/api';

const TYPE_META = {
  tool_access:      { icon: Shield, color: 'text-teal-600',   bg: 'bg-teal-50',   label: 'Tool Access' },
  data_protection:  { icon: Lock,   color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Data Protection' },
  approval:         { icon: Clock,  color: 'text-orange-500', bg: 'bg-orange-50', label: 'Approval Flow' },
  rate_limit:       { icon: Zap,    color: 'text-purple-600', bg: 'bg-purple-50', label: 'Rate Limit' },
};

const DEFAULT_CONFIG = {
  tool_access:     { allowedTools: ['read_public_document'], blockedTools: [], requireApprovalAbove: 30, maxRiskScore: 59 },
  data_protection: { blockPII: true, blockSecrets: true, redactBeforeLog: true },
  approval:        { requireApprovalTools: [], autoApproveBelow: 20 },
  rate_limit:      { maxRequestsPerMinute: 60, maxRequestsPerHour: 500 },
};

function PolicyCard({ policy, onRefresh }) {
  const meta = TYPE_META[policy.POLICY_TYPE] || TYPE_META.tool_access;
  const Icon = meta.icon;
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-800 truncate">{policy.NAME}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
            Number(policy.ENABLED) === 1 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {Number(policy.ENABLED) === 1 ? 'Active' : 'Disabled'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{meta.label} · v{policy.VERSION_NUM || 1}</p>
        {policy.DESCRIPTION && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{policy.DESCRIPTION}</p>}
        <p className="text-xs text-slate-300 mt-1">Created {policy.CREATED_AT ? new Date(policy.CREATED_AT).toLocaleDateString() : '—'}</p>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', description: '', policy_type: 'tool_access', enabled: true,
  });
  const [config, setConfig]   = useState(JSON.stringify(DEFAULT_CONFIG.tool_access, null, 2));
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const submit = async () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    let parsed;
    try { parsed = JSON.parse(config); } catch { setErr('Configuration is not valid JSON.'); return; }
    setSaving(true); setErr('');
    try {
      await api.post('/policies', { ...form, configuration: parsed });
      onCreated();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Create failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Create Policy</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {err && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">{err}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Policy Name *</label>
            <input className="input" placeholder="e.g. Strict Tool Access" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <input className="input" placeholder="Brief description" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
            <select className="input" value={form.policy_type}
              onChange={e => {
                const t = e.target.value;
                setForm(f => ({ ...f, policy_type: t }));
                setConfig(JSON.stringify(DEFAULT_CONFIG[t] || {}, null, 2));
              }}>
              <option value="tool_access">Tool Access</option>
              <option value="data_protection">Data Protection</option>
              <option value="approval">Approval Flow</option>
              <option value="rate_limit">Rate Limit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Configuration (JSON)</label>
            <textarea className="input font-mono text-xs min-h-[160px]" value={config}
              onChange={e => setConfig(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="enabled" checked={form.enabled}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="accent-teal-600" />
            <label htmlFor="enabled" className="text-sm text-slate-700">Enable immediately</label>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex items-center gap-1.5" onClick={submit} disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin" />} Create Policy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Policies() {
  const [policies, setPol] = useState([]);
  const [loading, setLoad] = useState(true);
  const [error, setError]  = useState('');
  const [showCreate, setCreate] = useState(false);

  const load = useCallback(async () => {
    setLoad(true); setError('');
    try {
      const { data } = await api.get('/policies');
      setPol(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load policies.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-4xl">
      {showCreate && <CreateModal onClose={() => setCreate(false)} onCreated={load} />}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CheckCircle size={20} className="text-amber-400" /> Security Policies
        </h1>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setCreate(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> New Policy
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Define and manage enforcement rules for AI agent tool access, data protection, and approval workflows.
      </p>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading policies…
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Shield size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-3">No policies configured yet.</p>
          <button className="btn-primary" onClick={() => setCreate(true)}>Create Your First Policy</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map(pol => <PolicyCard key={pol.ID} policy={pol} onRefresh={load} />)}
        </div>
      )}
    </div>
  );
}
