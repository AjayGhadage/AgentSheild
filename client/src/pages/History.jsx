import { useEffect, useState, useCallback } from 'react';
import { Clock, Filter, RefreshCw, Loader2, ShieldCheck, ShieldX, ShieldAlert, Hash, Download } from 'lucide-react';
import api from '../services/api';

const DEC_ICON = {
  ALLOW:            ShieldCheck,
  CONFIRM:          ShieldAlert,
  REQUIRE_APPROVAL: ShieldAlert,
  BLOCK:            ShieldX,
  ISOLATE:          ShieldAlert,
};
const DEC_COLOR = {
  ALLOW:            'text-teal-600',
  CONFIRM:          'text-orange-500',
  REQUIRE_APPROVAL: 'text-orange-500',
  BLOCK:            'text-red-500',
  ISOLATE:          'text-purple-600',
};

export default function History() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoad]      = useState(true);
  const [error, setError]       = useState('');
  const [chainOk, setChain]     = useState(null);
  const [verifying, setVerify]  = useState(false);
  const [filters, setFilters]   = useState({ eventType: '' });
  const [page, setPage]         = useState(1);

  const load = useCallback(async () => {
    setLoad(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (filters.eventType) params.set('eventType', filters.eventType);
      const { data } = await api.get(`/audit?${params}`);
      setLogs(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit history.');
    } finally { setLoad(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const verifyChain = async () => {
    setVerify(true);
    try {
      const { data } = await api.post('/audit/verify');
      setChain(data.verification);
    } catch (e) {
      setChain({ valid: false, checkedCount: 0, firstBrokenAt: 'Request failed' });
    } finally { setVerify(false); }
  };

  const exportCertificate = () => {
    const cert = {
      certificateTitle: "AgentShield AI — Verified Forensic Audit Ledger",
      complianceStandards: [
        "NIST AI 600-1 Generative AI Profile",
        "Digital Personal Data Protection Act (DPDP Act 2023, India)",
        "OWASP Top 10 for LLMs (LLM01 / LLM02)",
      ],
      issuedAt: new Date().toISOString(),
      cryptographicStatus: chainOk?.valid ? "VERIFIED_TAMPER_PROOF" : "UNVERIFIED",
      verifiedRecords: chainOk?.checkedCount || logs.length,
      firstBrokenRecord: chainOk?.firstBrokenAt || null,
      auditHashChainSample: logs.slice(0, 15).map(l => ({
        eventId: l.EVENT_ID,
        traceId: l.TRACE_ID,
        eventType: l.EVENT_TYPE,
        decision: l.DECISION,
        recordHash: l.RECORD_HASH,
        previousHash: l.PREVIOUS_HASH,
        timestamp: l.CREATED_AT,
      })),
    };

    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AgentShield_Forensic_Certificate_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-amber-400" /> Tamper-Evident Audit History
        </h1>
        <div className="flex gap-2">
          <button onClick={exportCertificate} className="btn-outline flex items-center gap-1.5 text-xs">
            <Download size={13} /> Export Forensic Certificate
          </button>
          <button onClick={verifyChain} disabled={verifying}
            className="btn-outline flex items-center gap-1.5 text-xs">
            <Hash size={13} />
            {verifying ? 'Verifying…' : 'Verify SHA-256 Chain'}
          </button>
          <button onClick={load} className="btn-outline flex items-center gap-1.5 text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Tamper-evident SHA-256 hash chain of every security decision made by AgentShield.
      </p>

      {/* Chain integrity banner */}
      {chainOk && (
        <div className={`mb-4 rounded-lg p-3 flex items-center gap-3 border text-sm
          ${chainOk.valid ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {chainOk.valid
            ? <ShieldCheck size={16} className="shrink-0" />
            : <ShieldX size={16} className="shrink-0" />}
          <span>
            {chainOk.valid
              ? `Chain integrity VALID — ${chainOk.checkedCount} records verified.`
              : `Chain BROKEN at record ${chainOk.firstBrokenAt}. Possible tampering detected.`}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <input
            className="input w-auto text-sm py-1.5"
            placeholder="Filter by event type…"
            value={filters.eventType}
            onChange={e => { setFilters(f => ({ ...f, eventType: e.target.value })); setPage(1); }}
          />
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Loading logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No audit records yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Decision', 'Event Type', 'Resource', 'Agent ID', 'Time', 'Hash (short)'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log, i) => {
                    const Icon = DEC_ICON[log.DECISION] || ShieldAlert;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <Icon size={15} className={DEC_COLOR[log.DECISION] || 'text-slate-400'} />
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-700">{log.EVENT_TYPE}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {log.RESOURCE_TYPE}{log.RESOURCE_ID ? ` / ${String(log.RESOURCE_ID).slice(0, 8)}…` : ''}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono truncate max-w-[100px]">
                          {log.AGENT_ID ? String(log.AGENT_ID).slice(0, 8) + '…' : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {log.CREATED_AT ? new Date(log.CREATED_AT).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">
                          {log.RECORD_HASH ? log.RECORD_HASH.slice(0, 12) + '…' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <button className="btn-outline text-sm py-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="text-xs text-slate-400">Page {page}</span>
              <button className="btn-outline text-sm py-1" disabled={logs.length < 30} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
