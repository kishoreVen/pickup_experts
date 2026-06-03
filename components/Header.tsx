'use client';

import { Share2, Save, Plus, Settings } from 'lucide-react';

interface HeaderProps {
  onShare: () => void;
  onSave: () => void;
  onNew: () => void;
  onOpenSettings: () => void;
}

export default function Header({ onShare, onSave, onNew, onOpenSettings }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2d22] bg-[#080e0c] flex-shrink-0 h-14">
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none">⚽</span>
        <div>
          <div className="font-black text-[11px] uppercase tracking-[0.18em] text-white leading-tight">
            Pickup Experts
          </div>
          <div className="text-[9px] text-[#22c55e] uppercase tracking-[0.15em] font-semibold leading-tight">
            Tactics Board
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c] text-[11px] font-bold uppercase tracking-wider transition-all">
          <Plus size={11} />
          New
        </button>
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c] text-[11px] font-bold uppercase tracking-wider transition-all">
          <Save size={11} />
          Save
        </button>
        <button onClick={onShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#22c55e] hover:bg-[#16a34a] text-black text-[11px] font-black uppercase tracking-wider transition-all">
          <Share2 size={11} />
          Share
        </button>
        <button onClick={onOpenSettings} className="flex items-center justify-center w-8 h-8 rounded bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c] transition-all" aria-label="Settings">
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
