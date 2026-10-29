import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  Activity, DollarSign, Clock, TrendingUp, ArrowDownRight, 
  Download, Filter, AlertTriangle, ShieldAlert, Globe, Flame, LogOut, User,
  LayoutDashboard, AlertOctagon, Sliders
} from 'lucide-react';
import CashFlowChart from './components/CashFlowChart';
import PlaidModal from './components/PlaidModal';
import LoginPage from './components/LoginPage';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

const FX_RATES = { USD: 1.0, EUR: 0.92, GBP: 0.79, INR: 83.5 };
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

// ==========================================
// 1. OVERVIEW DASHBOARD VIEW
// ==========================================
function DashboardOverview({ 
  metrics, transactions, currency, formatCurrency, inflationRate, setInflationRate,
  inflationAdjustedRunway, seasonality, setSeasonality, chartData,
  showAnomaliesOnly, setShowAnomaliesOnly, selectedType, setSelectedType,
  selectedCategory, setSelectedCategory, categories, exportCSV, filteredTransactions, parseNumber 
}) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            CASH BALANCE ({currency}) <DollarSign className="w-4 h-4 text-blue-400"/>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(metrics.currentBalance)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            MONTHLY BURN RATE <ArrowDownRight className="w-4 h-4 text-rose-400"/>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {formatCurrency(metrics.monthlyBurn)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            INFLATION-ADJUSTED RUNWAY <Clock className="w-4 h-4 text-amber-400"/>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {inflationAdjustedRunway.toFixed(1)} <span className="text-sm font-normal text-slate-400">Months</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            PROJECTED Q4 OUTFLOW <TrendingUp className="w-4 h-4 text-emerald-400"/>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(metrics.projectedNextQuarterBurn)}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Flame className="w-5 h-5 text-rose-400" />
          <div>
            <div className="text-sm font-semibold text-slate-200">Annual Inflation Indexing Stress-Test</div>
            <div className="text-xs text-slate-400">Simulate compounding macro inflation on operating burn rate</div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.5"
            value={inflationRate}
            onChange={(e) => setInflationRate(parseFloat(e.target.value))}
            className="w-full md:w-64 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
          <span className="text-sm font-bold text-rose-400 font-mono w-12">{inflationRate.toFixed(1)}%</span>
        </div>
      </div>

      <CashFlowChart data={chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Runway Scenario Simulation</h2>
          <p className="text-xs text-slate-400 mb-6">
            Adjust seasonality factor to test market growth or spend contraction scenarios.
          </p>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Seasonality Factor: <span className="text-emerald-400 font-bold">{(seasonality * 100).toFixed(0)}%</span>
            </label>
            <input 
              type="range" 
              min="-0.5" 
              max="0.5" 
              step="0.05"
              value={seasonality}
              onChange={(e) => setSeasonality(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>-50% Contraction</span>
              <span>Baseline (0%)</span>
              <span>+50% Growth</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">Real-Time Stream Ingestion (TimescaleDB)</h2>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  showAnomaliesOnly 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-semibold' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Anomalies Only
              </button>

              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select 
                  value={selectedType} 
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-transparent text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">All Types</option>
                  <option value="INFLOW" className="bg-slate-900 text-emerald-400">Inflow</option>
                  <option value="OUTFLOW" className="bg-slate-900 text-rose-400">Outflow</option>
                </select>
              </div>

              {categories.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs">
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-transparent text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-slate-200">{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                onClick={exportCSV}
                className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Export current logs to CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="p-3">UTC Timestamp</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-500 text-xs">
                      {transactions.length === 0 ? 'Awaiting live transaction stream...' : 'No transactions match current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => {
                    const amountNum = parseNumber(tx.amount);
                    return (
                      <tr 
                        key={tx.id || idx} 
                        className={`transition-colors ${
                          tx.isAnomaly 
                            ? 'bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-rose-500' 
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="p-3 text-slate-400 font-mono text-xs">
                          {new Date(tx.event_timestamp).toISOString()}
                        </td>
                        <td className="p-3 text-slate-200">{tx.category || 'General'}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded ${
                            tx.type === 'INFLOW' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3">
                          {tx.isAnomaly ? (
                            <span 
                              className="inline-flex items-center gap-1 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded"
                              title={`Z-Score: ${tx.zScore}`}
                            >
                              <AlertTriangle className="w-3 h-3" /> SPIKE (Z: {tx.zScore})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">Normal</span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-mono font-semibold ${amountNum >= 0 ? 'text-emerald-400' : tx.isAnomaly ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                          {amountNum >= 0 ? `+${formatCurrency(amountNum)}` : `-${formatCurrency(Math.abs(amountNum))}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. ANOMALY CENTER PAGE (/anomalies)
// ==========================================
function AnomalyCenterPage({ transactions, formatCurrency }) {
  const anomalies = useMemo(() => transactions.filter(t => t.isAnomaly), [transactions]);
  const [statuses, setStatuses] = useState({});

  const handleStatusChange = (id, status) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-rose-400">🚨</span> Risk & Anomaly Triage Center
        </h2>
        <p className="text-sm text-slate-400">
          Isolation Forest and Z-score statistical outlier management dashboard.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Category</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Z-Score / Metric</th>
              <th className="p-4">Triage Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  No anomalies flagged in active memory stream.
                </td>
              </tr>
            ) : (
              anomalies.map(tx => {
                const status = statuses[tx.id] || 'Under Investigation';
                return (
                  <tr key={tx.id || tx.event_timestamp} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-400">
                      {new Date(tx.event_timestamp).toISOString()}
                    </td>
                    <td className="p-4 font-semibold text-white">{tx.category || 'General Operating'}</td>
                    <td className="p-4 font-bold text-rose-400">
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        Z: {tx.zScore ?? '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        status === 'Approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : status === 'Flagged Fraud'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleStatusChange(tx.id, 'Approved')}
                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs transition cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(tx.id, 'Flagged Fraud')}
                        className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-xs transition cursor-pointer"
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
  );
}

// ==========================================
// 3. SCENARIO SIMULATOR PAGE (/scenarios)
// ==========================================
function ScenarioBuilderPage() {
  const { token } = useAuth();
  const [baseRunway, setBaseRunway] = useState(0);
  const [scenarioLoading, setScenarioLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!token) { setScenarioLoading(false); return () => { active = false; }; }
    fetch('http://localhost:5000/api/analytics/forecast', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => { if (!response.ok) throw new Error('Could not load runway'); return response.json(); })
      .then((data) => { if (active) setBaseRunway(Number(data.runwayMonths) || 0); })
      .catch((error) => console.error('Scenario baseline load failed:', error))
      .finally(() => { if (active) setScenarioLoading(false); });
    return () => { active = false; };
  }, [token]);
  const [headcountGrowth, setHeadcountGrowth] = useState(15);
  const [marketingScale, setMarketingScale] = useState(25);
  const [revenueChange, setRevenueChange] = useState(8);

  const adjustedRunway = (
    baseRunway * (1 + revenueChange / 100) / (1 + (headcountGrowth * 0.02) + (marketingScale * 0.015))
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-indigo-400">🎲</span> Runway Scenario Stress-Tester
        </h2>
        <p className="text-sm text-slate-400">
          Explore a simplified runway scenario using the current backend-derived runway as its baseline. This is a deterministic estimate, not a Monte Carlo simulation.
        </p>
        {scenarioLoading && <p className="text-xs text-slate-500">Loading current runway baseline…</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
          <h3 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">
            Simulation Parameters
          </h3>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Headcount Expansion</span>
              <span className="text-indigo-400 font-mono">+{headcountGrowth} Roles</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={headcountGrowth}
              onChange={e => setHeadcountGrowth(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Marketing Spend Scale</span>
              <span className="text-indigo-400 font-mono">+{marketingScale}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={marketingScale}
              onChange={e => setMarketingScale(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Expected MoM Revenue Growth</span>
              <span className="text-emerald-400 font-mono">+{revenueChange}%</span>
            </div>
            <input
              type="range"
              min="-20"
              max="50"
              value={revenueChange}
              onChange={e => setRevenueChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="font-semibold text-slate-200 mb-4">Projected Horizon Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg">
                <div className="text-xs text-slate-400">Baseline Cash Runway</div>
                <div className="text-3xl font-bold text-slate-200 mt-1">{baseRunway} Mo</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg">
                <div className="text-xs text-slate-400">Stress-Tested Horizon</div>
                <div className={`text-3xl font-bold mt-1 ${Number(adjustedRunway) < 6 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {adjustedRunway} Mo
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-lg">
            <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-1">
              Scenario Interpretation
            </div>
            <p className="text-sm text-slate-300">
              This result is a deterministic what-if estimate based on the current runway and the selected revenue, headcount, and marketing assumptions. It is not a probability or confidence interval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. MAIN LAYOUT WITH SIDEBAR & ROUTING
// ==========================================
function DashboardContent() {
  const { user, token, logout } = useAuth();

  const [metrics, setMetrics] = useState({
    currentBalance: 0,
    monthlyBurn: 0,
    runwayMonths: 0,
    projectedNextQuarterBurn: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [seasonality, setSeasonality] = useState(0.0);
  const [currency, setCurrency] = useState('USD');
  const [inflationRate, setInflationRate] = useState(2.5);
  const [isPlaidOpen, setIsPlaidOpen] = useState(false);
  const [connectedBank, setConnectedBank] = useState(null);

  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  const txBufferRef = useRef([]);

  const parseNumber = useCallback((val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }, []);

  const formatCurrency = useCallback((amountUSD) => {
    const rate = FX_RATES[currency] || 1.0;
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const converted = parseNumber(amountUSD) * rate;
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currency, parseNumber]);

  const normalizeTx = useCallback((tx) => {
    const rawAmt = parseNumber(tx.amount);
    const calculatedType = tx.type || (rawAmt >= 0 ? 'INFLOW' : 'OUTFLOW');
    return {
      ...tx,
      type: calculatedType,
      amount: rawAmt,
      event_timestamp: tx.event_timestamp || tx.timestamp || tx.date || new Date().toISOString()
    };
  }, [parseNumber]);

  const fetchForecast = useCallback(async (seasonalityValue) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/analytics/forecast?seasonality=${seasonalityValue}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    }
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/transactions?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map(normalizeTx);
        setTransactions(normalized);
        txBufferRef.current = normalized;
      }
    } catch (e) {
      console.error('Failed to fetch transaction history', e);
    }
  }, [token, normalizeTx]);

  useEffect(() => {
    fetchForecast(seasonality);
    fetchTransactions();
  }, [fetchForecast, fetchTransactions, seasonality]);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:5000?token=${encodeURIComponent(token)}`);
    ws.onopen = () => console.log('WebSocket connected');
    ws.onerror = (event) => console.error('WebSocket error:', event);
    ws.onclose = (event) => {
      console.log('WebSocket closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'NEW_TRANSACTION') {
          const norm = normalizeTx(payload.transaction);
          txBufferRef.current = [norm, ...txBufferRef.current].slice(0, 50);
          setTransactions([...txBufferRef.current]);
          if (payload.metrics) setMetrics(payload.metrics);
        } else if (payload.event === 'METRICS_UPDATE' || payload.event === 'PLAID_SYNC') {
          if (payload.metrics) setMetrics(payload.metrics);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    return () => ws.close();
  }, [token, normalizeTx]);

  const inflationAdjustedRunway = useMemo(() => {
    const cash = Math.max(0, parseNumber(metrics.currentBalance));
    const baseBurn = parseNumber(metrics.monthlyBurn);
    
    if (baseBurn <= 0 || cash <= 0) return 0;
    
    const monthlyInflationRate = (inflationRate / 100) / 12;
    let remainingCash = cash;
    let currentBurn = baseBurn;
    let months = 0;

    while (remainingCash > 0 && months < 120) {
      remainingCash -= currentBurn;
      currentBurn *= (1 + monthlyInflationRate);
      months += 1;
    }

    return months;
  }, [metrics.currentBalance, metrics.monthlyBurn, inflationRate, parseNumber]);

  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [transactions]);

  const anomalyCount = useMemo(() => {
    return transactions.filter((t) => t.isAnomaly).length;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesType = selectedType === 'ALL' || t.type === selectedType;
      const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
      const matchesAnomaly = !showAnomaliesOnly || t.isAnomaly;
      return matchesType && matchesCat && matchesAnomaly;
    });
  }, [transactions, selectedType, selectedCategory, showAnomaliesOnly]);

  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.event_timestamp) - new Date(b.event_timestamp)
    );

    const streamDelta = sorted.reduce((acc, t) => acc + parseNumber(t.amount), 0);
    const initialBalance = parseNumber(metrics.currentBalance) - streamDelta;
    const rate = FX_RATES[currency] || 1.0;

    let accumulator = initialBalance;
    return sorted.map((t) => {
      accumulator += parseNumber(t.amount);
      return {
        time: new Date(t.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        balance: Math.round(accumulator * rate * 100) / 100,
        isAnomaly: !!t.isAnomaly
      };
    });
  }, [transactions, metrics.currentBalance, currency, parseNumber]);

  const exportCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    const headers = ['Timestamp,Category,Type,Amount_USD,IsAnomaly,ZScore\n'];
    const rows = filteredTransactions.map((t) => {
      return `"${new Date(t.event_timestamp).toISOString()}","${t.category || 'General'}","${t.type}","${t.amount}","${t.isAnomaly || false}","${t.zScore || 0}"`;
    });

    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `horizonfi_transactions_${new Date().toISOString().slice(0,10)}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const navLinks = [
    { to: '/', label: 'Executive Overview', icon: LayoutDashboard },
    { to: '/anomalies', label: 'Risk & Anomalies', icon: AlertOctagon },
    { to: '/scenarios', label: 'Scenario Testing', icon: Sliders }
  ];

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                HorizonFi
              </span>
            </div>
            <nav className="space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-slate-800 pt-4 px-2 space-y-3">
            {user && (
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-medium truncate max-w-[120px]">{user.name}</span>
                </div>
                <button 
                  onClick={logout} 
                  className="text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="text-[11px] text-slate-500">
              AWS Lambda & TimescaleDB
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex justify-between items-center border-b border-slate-800 px-8 py-4 bg-slate-900/50 backdrop-blur-sm shrink-0 gap-4">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>❖</span> Enterprise Financial Engine
              </h1>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsPlaidOpen(true)}
                className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <span>{connectedBank ? '🟢' : '⚡'}</span>
                <span>{connectedBank ? `Live: ${connectedBank}` : 'Connect Plaid Bank Feed'}</span>
              </button>

              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                <Globe className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
                {['USD', 'EUR', 'GBP', 'INR'].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`px-2.5 py-1 font-semibold rounded-md transition cursor-pointer ${
                      currency === curr ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>

              {anomalyCount > 0 && (
                <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-full text-rose-400 text-xs font-semibold animate-bounce">
                  <ShieldAlert className="w-3.5 h-3.5" /> {anomalyCount} Anomaly
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-full text-blue-400 text-xs">
                <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Stream
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route 
                path="/" 
                element={
                  <DashboardOverview 
                    metrics={metrics}
                    transactions={transactions}
                    currency={currency}
                    formatCurrency={formatCurrency}
                    inflationRate={inflationRate}
                    setInflationRate={setInflationRate}
                    inflationAdjustedRunway={inflationAdjustedRunway}
                    seasonality={seasonality}
                    setSeasonality={setSeasonality}
                    chartData={chartData}
                    showAnomaliesOnly={showAnomaliesOnly}
                    setShowAnomaliesOnly={setShowAnomaliesOnly}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={categories}
                    exportCSV={exportCSV}
                    filteredTransactions={filteredTransactions}
                    parseNumber={parseNumber}
                  />
                } 
              />
              <Route 
                path="/anomalies" 
                element={<AnomalyCenterPage transactions={transactions} formatCurrency={formatCurrency} />} 
              />
              <Route 
                path="/scenarios" 
                element={<ScenarioBuilderPage />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        <PlaidModal 
          isOpen={isPlaidOpen} 
          onClose={() => setIsPlaidOpen(false)} 
          onConnected={(bankName) => setConnectedBank(bankName)} 
        />
      </div>
    </BrowserRouter>
  );
}

function MainLayout() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Initializing HorizonFi Security Session...
      </div>
    );
  }

  return token ? <DashboardContent /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}