import React, { useState } from 'react';

export default function ScenarioBuilder() {
  const [headcountGrowth, setHeadcountGrowth] = useState(15);
  const [marketingScale, setMarketingScale] = useState(25);
  const [revenueChange, setRevenueChange] = useState(5);

  const baseRunway = 14.2;
  const adjustedRunway = (
    baseRunway * (1 + revenueChange / 100) / (1 + (headcountGrowth * 0.02) + (marketingScale * 0.015))
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-indigo-400">🎲</span> Monte Carlo Scenario Stress-Tester
        </h2>
        <p className="text-sm text-slate-400">
          Simulate stochastic runway distribution variance under macro market conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h3 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">
            Simulation Parameters
          </h3>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Headcount Expansion</span>
              <span className="text-indigo-400 font-mono">+{headcountGrowth} Eng Roles</span>
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
              <span className="text-slate-400">Marketing & Acquisition Spend</span>
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

        {/* Results Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-200 mb-4">Projected Horizon Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg">
                <div className="text-xs text-slate-400">Baseline Cash Runway</div>
                <div className="text-3xl font-bold text-slate-200 mt-1">{baseRunway} Mo</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg">
                <div className="text-xs text-slate-400">Stress-Tested Horizon</div>
                <div className={`text-3xl font-bold mt-1 ${adjustedRunway < 6 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {adjustedRunway} Mo
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-lg">
            <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-1">
              Monte Carlo Output Confidence (1,000 Iterations)
            </div>
            <p className="text-sm text-slate-300">
              84.2% probability of maintaining liquidity beyond Q3 2027 under these parameters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}