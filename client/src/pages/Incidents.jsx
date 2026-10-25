import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Filter, RefreshCw, Loader2, CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react';
import api from '../services/api';

const SEV_COLOR = {
  low:      'badge-low',
  medium:   'badge-medium',
  high:     'badge-high',
  critical: 'badge-critical',
};
const STATUS_COLOR = {
  open:          'bg-red-100 text-red-700',
  investigating: 'bg-orange-100 text-orange-700',
  resolved:      'bg-teal-100 text-teal-700',
};

function IncidentModal({ inc, onClose, onUpdate }) {
  const [notes, setNotes]       = useState('');
  const [status, setStatus]     = useState(inc.STATUS?.toLowerCase() || 'open');
  const [saving, setSaving]     = useState(false);
  const [events, setEvents]     = useState([]);

  useEffect(() => {
    api.get(`/incidents/${inc.ID}`)
      .then(r => setEvents(r.data.events || []))
      .catch(() => {});
  }, [inc.ID]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/incidents/${inc.ID}`, { status, notes: notes.trim() || undefined });
      onUpdate();
      onClose();
    } catch (e) {
      alert(e.response?.data?.error || 'Update failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 text-base">{inc.TITLE}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SEV_COLOR[inc.SEVERITY?.toLowerCase()]}`}>
              {inc.SEVERITY?.toUpperCase()} SEVERITY
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[inc.STATUS?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
              {inc.STATUS}
            </span>
          </div>

          {events.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">TIMELINE</p>
              <ul className="space-y-2">
                {events.map((ev, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600">
                    <span className="text-slate-300 shrink-0 mt-0.5">▸</span>
                    <span><span className="font-medium">{ev.EVENT_TYPE?.replace(/_/g, ' ')}</span>{ev.EVENT_DATA_REDACTED ? ` — ${ev.EVENT_DATA_REDACTED}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Update Status</label>
            <select className="input mb-3" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Add a Note</label>
            <textarea className="input min-h-[80px]" placeholder="Enter investigation notes…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex items-center gap-1.5" onClick={save} disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Incidents() {
  const [incidents, setInc]   = useState([]);
  const [loading, setLoad]    = useState(true);
  const [error, setError]     = useState('');
  const [filters, setFilters] = useState({ status: '', severity: '' });
  const [selected, setSel]    = useState(null);

  const load = useCallback(async () => {
    setLoad(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filters.status)   params.set('status', filters.status);
      if (filters.severity) params.set('severity', filters.severity);
      const { data } = await api.get(`/incidents?${params}`);
      setInc(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load incidents.');
    } finally { setLoad(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-5xl">
      {selected && (
        <IncidentModal inc={selected} onClose={() => setSel(null)} onUpdate={load} />
      )}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-400" /> Incidents
        </h1>
        <button onClick={load} className="btn-outline flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Security incidents raised by AgentShield. Click any row to investigate or update status.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select className="input w-auto text-sm py-1.5"
            value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <select className="input w-auto text-sm py-1.5"
          value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Loading incidents…
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No incidents found. Your environment is clean 🎉</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Title', 'Severity', 'Status', 'Created', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map(inc => (
                  <tr key={inc.ID} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSel(inc)}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{inc.TITLE}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${SEV_COLOR[inc.SEVERITY?.toLowerCase()]}`}>
                        {inc.SEVERITY}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[inc.STATUS?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                        {inc.STATUS}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {inc.CREATED_AT ? new Date(inc.CREATED_AT).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3"><ChevronRight size={14} className="text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
