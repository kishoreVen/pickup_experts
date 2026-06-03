'use client';

import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { apiKey, setApiKey } = useSettings();
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = () => {
    setApiKey(inputKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md mx-4 bg-[#0e1a15] border border-[#1a2d22] rounded-2xl shadow-2xl overflow-hidden">
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

        <div className="p-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#22c55e] mb-1">
            Anthropic API Key
          </h3>
          <p className="text-[11px] text-[#5a7a64] mb-3 leading-relaxed">
            Optional — overrides the server key. Stored locally in your browser only.
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
            {keySaved && <span className="text-[11px] text-[#22c55e] font-bold">✓ Saved</span>}
            {apiKey && !keySaved && <span className="text-[11px] text-[#5a7a64]">✓ Key saved</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
