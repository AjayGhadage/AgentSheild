import { useEffect, useState, useCallback, useRef } from 'react';
import { FlaskConical, Play, Loader2, RefreshCw, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import api from '../services/api';

function MetricBar({ label, value, color = 'teal' }) {
  const pct = Math.round((value || 0) * 100);
  const colors = { teal: 'bg-teal-500', red: 'bg-red-500', orange: 'bg-orange-400', blue: 'bg-blue-500' };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[color]}`} style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function EvaluationLab() {
  const [datasets, setDs]     = useState([]);
  const [dsId, setDsId]       = useState('');
  const [runs, setRuns]       = useState([]);
  const [activeRun, setActive] = useState(null);
  const [loading, setLoad]    = useState(false);
  const [error, setError]     = useState('');
  const pollRef               = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [dsRes, runsRes] = await Promise.all([
        api.get('/evaluation/datasets'),
        api.get('/evaluation/runs'),
      ]);
      const ds = dsRes.data.datasets || [];
      setDs(ds);
      if (ds.length > 0 && !dsId) setDsId(ds[0].ID || ds[0].id);
      setRuns(runsRes.data.runs || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load evaluation data.');
    }
  }, [dsId]);

  useEffect(() => {
    loadAll();
    return () => clearInterval(pollRef.current);
  }, []);

  const startRun = async () => {
    if (!dsId) return;
    setLoad(true); setError(''); setActive(null);
    try {
      const { data } = await api.post('/evaluation/runs', { datasetId: dsId });
      const runId = data.runId;
      setRuns(prev => [{ ID: runId, STATUS: 'running', STARTED_AT: new Date() }, ...prev]);
      // Poll until completed
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.get(`/evaluation/runs/${runId}`);
          const run = r.data.run;
          if (run.STATUS === 'completed' || run.STATUS === 'failed') {
            clearInterval(pollRef.current);
            const metrics = run.METRICS_JSON
              ? (typeof run.METRICS_JSON === 'string' ? JSON.parse(run.METRICS_JSON) : run.METRICS_JSON)
              : null;
            setActive({ ...run, metrics });
            loadAll();
          }
        } catch { clearInterval(pollRef.current); }
      }, 2000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to start run.');
    } finally { setLoad(false); }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FlaskConical size={20} className="text-amber-400" /> Evaluation Lab
        </h1>
        <button onClick={loadAll} className="btn-outline flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Benchmark AgentShield's detection accuracy using curated test datasets. Measures precision, recall, and F1 score.
      </p>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {/* Run panel */}
      <div className="card mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Start Benchmark Run</h2>
        {datasets.length === 0 ? (
          <p className="text-sm text-slate-400">No benchmark datasets available. Datasets are seeded by the database schema.</p>
        ) : (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Dataset</label>
              <select className="input" value={dsId} onChange={e => setDsId(e.target.value)}>
                {datasets.map(d => (
                  <option key={d.ID || d.id} value={d.ID || d.id}>{d.NAME} v{d.VERSION}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={startRun} disabled={loading || !dsId}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {loading ? 'Running…' : 'Run Benchmark'}
            </button>
          </div>
        )}
      </div>

      {/* Active run metrics */}
      {activeRun?.metrics && (
        <div className="card mb-6 border-purple-200 bg-purple-50/30">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-purple-600" />
            <h2 className="font-semibold text-slate-800">Latest Run Results</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700">Completed</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total Cases', value: activeRun.metrics.totalCases, unit: '' },
              { label: 'True Positives', value: activeRun.metrics.truePositives, unit: '' },
              { label: 'False Positives', value: activeRun.metrics.falsePositives, unit: '' },
              { label: 'False Negatives', value: activeRun.metrics.falseNegatives, unit: '' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-2xl font-bold text-slate-800">{m.value ?? '—'}</p>
                <p className="text-xs text-slate-500">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <MetricBar label="Precision" value={activeRun.metrics.precision} color="teal" />
            <MetricBar label="Recall" value={activeRun.metrics.recall} color="blue" />
            <MetricBar label="F1 Score" value={activeRun.metrics.f1Score} color="orange" />
            <MetricBar label="Detection Rate" value={activeRun.metrics.detectionRate} color="teal" />
          </div>
        </div>
      )}

      {/* Run history table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <h2 className="font-semibold text-slate-700 text-sm">Run History</h2>
        </div>
        {runs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <FlaskConical size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No runs yet. Start your first benchmark above.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Run ID', 'Status', 'F1 Score', 'Total Cases', 'Started'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {runs.map((r, i) => {
                const metrics = r.METRICS_JSON
                  ? (typeof r.METRICS_JSON === 'string' ? JSON.parse(r.METRICS_JSON) : r.METRICS_JSON)
                  : null;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-600">{String(r.ID || '').slice(0, 12)}…</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-semibold ${
                        r.STATUS === 'completed' ? 'text-teal-600' :
                        r.STATUS === 'running' ? 'text-blue-500' : 'text-red-500'
                      }`}>
                        {r.STATUS === 'completed' ? <CheckCircle size={12} /> :
                         r.STATUS === 'running' ? <Loader2 size={12} className="animate-spin" /> :
                         <XCircle size={12} />}
                        {r.STATUS}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">
                      {metrics?.f1Score != null ? `${Math.round(metrics.f1Score * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{metrics?.totalCases ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {r.STARTED_AT ? new Date(r.STARTED_AT).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
