import React, { useState } from 'react';

export default function PlaidModal({ isOpen, onClose, onConnected }) {
  const [selectedBank, setSelectedBank] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const banks = [
    { name: 'Mercury Bank', logo: '🏛️', type: 'Checking (...4821)' },
    { name: 'Silicon Valley Bank', logo: '🏦', type: 'Operating (...9012)' },
    { name: 'Chase Business', logo: '💳', type: 'Corporate Credit (...1104)' }
  ];

  const handleConnect = async (bankName) => {
    setSelectedBank(bankName);
    setLoading(true);

    try {
      // Retrieve stored session token
      const token = localStorage.getItem('hz_token');
      if (!token) throw new Error('Please sign in again before connecting a bank.');

      const response = await fetch('http://localhost:5000/api/webhooks/plaid', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bankName, accountType: 'Business Operating' })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      setTimeout(() => {
        setLoading(false);
        onConnected(bankName);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to trigger Plaid webhook:', err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="text-emerald-400">⚡</span> Plaid Open-Banking Sync
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
        
        <p className="text-sm text-slate-400 mb-6">
          Connect your primary institution to stream live bank transactions directly into TimescaleDB.
        </p>

        <div className="space-y-3">
          {banks.map((bank) => (
            <button
              key={bank.name}
              disabled={loading}
              onClick={() => handleConnect(bank.name)}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bank.logo}</span>
                <div className="text-left">
                  <div className="font-semibold text-sm text-slate-200">{bank.name}</div>
                  <div className="text-xs text-slate-400">{bank.type}</div>
                </div>
              </div>
              {loading && selectedBank === bank.name ? (
                <span className="text-xs text-emerald-400 font-semibold animate-pulse">Syncing...</span>
              ) : (
                <span className="text-xs text-slate-400">Connect →</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}