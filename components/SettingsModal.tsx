'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';

interface SettingsModalProps {
  onClose: () => void;
  onOpenAuth: () => void;
}

export default function SettingsModal({ onClose, onOpenAuth }: SettingsModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { apiKey, setApiKey } = useSettings();
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);

  const handleSaveKey = () => {
    setApiKey(inputKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setManagingBilling(false);
    }
  };

  const isPro = profile?.subscription_tier === 'pro';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md mx-4 bg-[#0e1a15] border border-[#1a2d22] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2d22]">
          <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-[#5a7a64] hover:text-white transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* ── API Key Section ── */}
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#22c55e] mb-1">
              API Key
            </h3>
            <p className="text-[11px] text-[#5a7a64] mb-3 leading-relaxed">
              Enter your own Anthropic API key. Stored locally in your browser — never sent to our servers directly.
            </p>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-[#080e0c] border border-[#1a2d22] rounded-lg px-3 py-2.5 pr-20 text-[12px] text-white placeholder-[#3a5a44] focus:outline-none focus:border-[#22c55e] transition-colors"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#5a7a64] hover:text-white uppercase tracking-wider font-bold transition-colors"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-black text-[11px] font-black uppercase tracking-wider transition-all"
              >
                Save Key
              </button>
              {keySaved && (
                <span className="text-[11px] text-[#22c55e] font-bold">✓ Key saved</span>
              )}
              {apiKey && !keySaved && (
                <span className="text-[11px] text-[#5a7a64]">✓ Key saved</span>
              )}
            </div>
          </section>

          {/* ── Subscription Section ── */}
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#f97316] mb-1">
              Subscription
            </h3>

            {!user ? (
              <div className="bg-[#080e0c] border border-[#1a2d22] rounded-xl p-4 text-center">
                <p className="text-[12px] text-[#7a9882] mb-3 leading-relaxed">
                  Sign in to access Pro features and use our AI key.
                </p>
                <button
                  onClick={() => { onClose(); onOpenAuth(); }}
                  className="px-5 py-2.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-black text-[11px] font-black uppercase tracking-wider transition-all"
                >
                  Sign In
                </button>
              </div>
            ) : isPro ? (
              <div className="bg-[#080e0c] border border-[#1a2d22] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded bg-[#f97316] text-black text-[10px] font-black uppercase tracking-wider">
                    Pro Active
                  </span>
                </div>
                <p className="text-[11px] text-[#7a9882] mb-3 leading-relaxed">
                  You have full access to AI generation using our Anthropic key.
                </p>
                <button
                  onClick={handleManageBilling}
                  disabled={managingBilling}
                  className="px-4 py-2 rounded-lg bg-[#1a2d22] hover:bg-[#243d2c] text-[#7a9882] hover:text-white text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {managingBilling ? 'Loading...' : 'Manage Billing'}
                </button>
                <button
                  onClick={refreshProfile}
                  className="ml-2 px-4 py-2 rounded-lg bg-[#1a2d22] hover:bg-[#243d2c] text-[#7a9882] hover:text-white text-[11px] font-black uppercase tracking-wider transition-all"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="bg-[#080e0c] border border-[#1a2d22] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-black text-white">Go Pro</p>
                    <p className="text-[11px] text-[#f97316] font-bold">$0.99 / month</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#1a2d22] text-[#5a7a64] text-[10px] font-black uppercase tracking-wider">
                    Free
                  </span>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {[
                    'Use our Anthropic API key',
                    '100 AI generations per month',
                    'Save unlimited strategies',
                    'Priority support',
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] text-[#7a9882]">
                      <span className="text-[#22c55e] font-bold">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="w-full py-2.5 rounded-lg bg-[#f97316] hover:bg-[#ea6a00] text-black text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {upgrading ? 'Redirecting...' : 'Upgrade to Pro — $0.99/mo'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
