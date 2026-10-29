import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SidebarNav() {
  const links = [
    { to: '/', label: 'Overview Dashboard', icon: '❖' },
    { to: '/anomalies', label: 'Risk & Anomalies', icon: '🚨' },
    { to: '/scenarios', label: 'Scenario Testing', icon: '🎲' }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg px-2">
          <span>❖</span> HorizonFi Engine
        </div>
        <nav className="space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="text-xs text-slate-500 border-t border-slate-800 pt-4 px-2">
        Connected to AWS Lambda + TimescaleDB
      </div>
    </aside>
  );
}