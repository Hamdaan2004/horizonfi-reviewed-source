
import React, { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:5000/api';

export default function AnomalyCenter() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingIds, setSavingIds] = useState([]);
  const [notice, setNotice] = useState('');

  const getToken = () => localStorage.getItem('hz_token');

  const fetchAnomalies = useCallback(async () => {
    const token = getToken();

    if (!token || token === 'hz_jwt_token_demo_2026_session') {
      setError('Your session is missing or invalid. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/transactions?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch transactions (HTTP ${res.status}).`);
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error('Unexpected response from the transaction API.');
      }

      // Keep the status returned by PostgreSQL.
      const flagged = data
        .filter(tx => tx.isAnomaly === true)
        .map(tx => ({
          ...tx,
          triage_status: tx.triage_status || 'Under Investigation'
        }));

      setAnomalies(flagged);
      setError('');
    } catch (err) {
      console.error('Failed to load anomalies:', err);
      setError(err.message || 'Failed to load anomaly data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleStatusChange = async (id, newStatus) => {
    console.log('React handler fired:', id, newStatus);
    const token = getToken();

    if (!token) {
      setError('Please log in again before updating triage status.');
      return;
    }

    setSavingIds(prev => [...prev, id]);
    setError('');
    setNotice('');

    try {
      const res = await fetch(`${API_URL}/transactions/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.success) {
        throw new Error(
          result.error || `Could not update status (HTTP ${res.status}).`
        );
      }

      // Update the UI only after the database confirms the change.
      setAnomalies(prev =>
        prev.map(item =>
          String(item.id) === String(id)
            ? {
                ...item,
                triage_status:
                  result.transaction.triage_status || newStatus
              }
            : item
        )
      );

      setNotice(`Transaction #TX-${id} saved as "${newStatus}".`);
    } catch (err) {
      console.error('Failed to update triage status:', err);
      setError(err.message || 'Failed to save triage status.');
    } finally {
      setSavingIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const formatAmount = amount =>
    Math.abs(Number(amount) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-rose-400">🚨</span>
            Risk &amp; Anomaly Management Center
          </h2>

          <p className="text-sm text-slate-400">
            Isolation Forest and Z-score anomaly detection results.
          </p>
        </div>

        <button
          onClick={fetchAnomalies}
          disabled={loading}
          className="px-3 py-2 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 text-xs"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm"
        >
          {error}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Category</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Z-Score</th>
                <th className="p-4">Triage Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500 animate-pulse">
                    Checking recent transactions for anomalies...
                  </td>
                </tr>
              ) : error && anomalies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-rose-400">
                    Unable to load anomalies. Check the error message above.
                  </td>
                </tr>
              ) : anomalies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500">
                    No anomalies detected in the recent transactions.
                  </td>
                </tr>
              ) : (
                anomalies.map(tx => {
                  const status =
                    tx.triage_status || 'Under Investigation';
                  const saving = savingIds.includes(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs text-slate-400">
                        #TX-{tx.id}
                      </td>

                      <td className="p-4 font-medium text-white">
                        {tx.category || 'General Operating'}
                      </td>

                      <td
                        className={`p-4 font-semibold ${
                          tx.type === 'INFLOW'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'INFLOW' ? '+' : '-'}$
                        {formatAmount(tx.amount)}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          {Number(tx.zScore ?? 0).toFixed(2)}
                        </span>
                        {tx.zScore == null && (
                          <span className="ml-2 text-xs text-slate-500">
                            Unavailable
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            status === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : status === 'Flagged Fraud'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleStatusChange(tx.id, 'Approved')}
                          disabled={saving || status === 'Approved'}
                          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving...' : 'Approve'}
                        </button>

                        <button
                          onClick={() => handleStatusChange(tx.id, 'Flagged Fraud')}
                          disabled={saving || status === 'Flagged Fraud'}
                          className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Flag Fraud
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Triage decisions are saved to PostgreSQL and should persist after refresh.
        Z-scores are calculated by the backend and may be zero when the local
        statistical detector does not produce a score.
      </p>
    </div>
  );
}
