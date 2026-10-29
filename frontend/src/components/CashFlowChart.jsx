import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CashFlowChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 text-center text-slate-500 text-sm">
        No trendline data available. Seed transactions or connect live bank feed.
      </div>
    );
  }

  // Format chart data so it handles both 'month' strings and raw ISO 'timestamp' strings
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: item.month || (item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''),
    balance: parseFloat(item.balance || item.amount || 0)
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Historical Cash Balance & Burn Trend</h2>
        <span className="text-xs text-emerald-400 font-mono">● Live Trendline</span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false}
              domain={['dataMin - 100000', 'dataMax + 100000']}
              tickFormatter={(val) => `$${(val / 1000000).toFixed(2)}M`} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Balance']}
            />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#balanceGrad)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}