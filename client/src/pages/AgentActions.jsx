import { useEffect, useState, useCallback } from 'react';
import { Activity, Filter, ChevronDown, ChevronUp, RefreshCw, Loader2, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import api from '../services/api';

const STATUS_BADGE = {
  completed: 'bg-teal-100 text-teal-700',
  blocked:   'bg-red-100 text-red-700',
  pending:   'bg-orange-100 text-orange-700',
  running:   'bg-blue-100 text-blue-700',
};
const STATUS_ICON = {
  completed: CheckCircle,
  blocked:   XCircle,
  pending:   Clock,
  running:   Loader2,
};
const RISK_BADGE = {
  low:      'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function riskLabel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function ActionRow({ action, onExpand, expanded }) {
  const Icon = STATUS_ICON[action.STATUS?.toLowerCase()] || Clock;
  const risk = riskLabel(Number(action.RISK_SCORE || 0));
  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => onExpand(action.ID)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon size={14} className={`shrink-0 ${action.STATUS === 'completed' ? 'text-teal-600' : action.STATUS === 'blocked' ? 'text-red-500' : 'text-orange-500'}`} />
            <span className="text-sm font-mono text-slate-700 truncate max-w-[180px]">{action.TOOL_NAME}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{action.AGENT_NAME}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[action.STATUS?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
            {action.STATUS}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${RISK_BADGE[risk]}`}>
            {risk.toUpperCase()} · {action.RISK_SCORE ?? '?'}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400">
          {action.CREATED_AT ? new Date(action.CREATED_AT).toLocaleString() : '—'}
        </td>
        <td className="px-4 py-3 text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-6 py-3">
            <p className="text-xs font-mono text-slate-500">Trace ID: {action.TRACE_ID || '—'}</p>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AgentActions() {
  const [actions, setActions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expandedId, setExp]    = useState(null);
  const [filters, setFilters]   = useState({ status: '', risk: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.risk)   params.set('risk', filters.risk);
      const { data } = await api.get(`/agent-actions?${params}`);
      setActions(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load actions.');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity size={20} className="text-amber-400" /> Agent Actions
        </h1>
        <button onClick={load} className="btn-outline flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        All tool calls intercepted by AgentShield's enforcement gateway.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select className="input w-auto text-sm py-1.5"
            value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <select className="input w-auto text-sm py-1.5"
          value={filters.risk} onChange={e => setFilters(f => ({ ...f, risk: e.target.value }))}>
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Loading actions…
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Activity size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No agent actions found. Run a sandbox scenario to generate actions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Tool Name', 'Agent', 'Status', 'Risk', 'Time', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map(a => (
                  <ActionRow
                    key={a.ID}
                    action={a}
                    expanded={expandedId === a.ID}
                    onExpand={id => setExp(prev => prev === id ? null : id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
