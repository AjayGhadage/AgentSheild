import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, XCircle, User, Loader2, RefreshCw, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import api from '../services/api';

const STATUS_STYLE = {
  pending:  { badge: 'bg-orange-100 text-orange-700', icon: Clock,       iconColor: 'text-orange-500' },
  approved: { badge: 'bg-teal-100 text-teal-700',    icon: CheckCircle,  iconColor: 'text-teal-600'  },
  rejected: { badge: 'bg-red-100 text-red-700',      icon: XCircle,      iconColor: 'text-red-500'   },
  expired:  { badge: 'bg-slate-100 text-slate-500',  icon: AlertCircle,  iconColor: 'text-slate-400' },
};

function ApprovalCard({ req, onAction }) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);
  const s = STATUS_STYLE[req.STATUS?.toLowerCase()] || STATUS_STYLE.pending;
  const Icon = s.icon;
  const isPending = req.STATUS?.toLowerCase() === 'pending';

  const act = async (action) => {
    if (!isPending) return;
    setLoading(true);
    try {
      await api.post(`/approvals/${req.ID}/${action}`, { reason });
      onAction();
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed');
    } finally { setLoading(false); }
  };

  return (
    <div className={`card border-l-4 space-y-4 transition-all ${
      isPending ? 'border-l-orange-400' : req.STATUS === 'approved' ? 'border-l-teal-500' : 'border-l-slate-300'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={16} className={`shrink-0 ${s.iconColor}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 font-mono truncate">{req.TOOL_NAME}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <User size={11} /> {req.AGENT_NAME || 'Unknown agent'}
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${s.badge}`}>
          {req.STATUS?.toUpperCase()}
        </span>
      </div>

      {/* Arguments */}
      {req.ARGUMENTS_REDACTED && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">ARGUMENTS</p>
          <pre className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 overflow-x-auto font-mono">
            {typeof req.ARGUMENTS_REDACTED === 'string'
              ? req.ARGUMENTS_REDACTED
              : JSON.stringify(req.ARGUMENTS_REDACTED, null, 2)}
          </pre>
        </div>
      )}

      {/* Risk score */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>Risk score: <span className={`font-bold ${Number(req.RISK_SCORE) >= 60 ? 'text-red-600' : Number(req.RISK_SCORE) >= 30 ? 'text-orange-500' : 'text-teal-600'}`}>{req.RISK_SCORE ?? '?'}/100</span></span>
        <span>Expires: {req.EXPIRES_AT ? new Date(req.EXPIRES_AT).toLocaleString() : '—'}</span>
      </div>

      {/* Approve / Reject */}
      {isPending && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <input className="input text-sm py-1.5"
            placeholder="Optional reason for approval/rejection…"
            value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button
              onClick={() => act('approve')}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ThumbsUp size={13} />}
              Approve & Execute
            </button>
            <button
              onClick={() => act('reject')}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ThumbsDown size={13} />}
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Approvals() {
  const [requests, setReq]  = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');
  const [filter, setFilter] = useState('pending');

  const load = useCallback(async () => {
    setLoad(true); setError('');
    try {
      const { data } = await api.get('/approvals');
      setReq(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load approval requests.');
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.STATUS?.toLowerCase() === filter);
  const pendingCount = requests.filter(r => r.STATUS?.toLowerCase() === 'pending').length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-amber-400" />
          Human Approval Queue
          {pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingCount} pending
            </span>
          )}
        </h1>
        <button onClick={load} className="btn-outline flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Review agent actions that require human sign-off before execution. Approved actions are executed immediately.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { key: 'pending',  label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'all',      label: 'All' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading approvals…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {filter === 'pending' ? 'No pending approvals. All agent actions are resolved.' : `No ${filter} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => (
            <ApprovalCard key={req.ID} req={req} onAction={load} />
          ))}
        </div>
      )}
    </div>
  );
}
