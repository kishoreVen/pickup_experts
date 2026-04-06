'use client';

import { Share2, Save, Plus, Edit3, Eye, Settings } from 'lucide-react';
import { Strategy } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/UserMenu';

interface HeaderProps {
  strategy: Strategy;
  isEditing: boolean;
  onShare: () => void;
  onSave: () => void;
  onNew: () => void;
  onToggleEdit: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
}

export default function Header({
  strategy,
  isEditing,
  onShare,
  onSave,
  onNew,
  onToggleEdit,
  onOpenAuth,
  onOpenSettings,
}: HeaderProps) {
  const { user, loading } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2d22] bg-[#080e0c] flex-shrink-0 h-14">
      {/* Brand + strategy title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2.5 flex-shrink-0">
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

        {strategy.title && (
          <>
            <div className="w-px h-7 bg-[#1a2d22] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{strategy.title}</p>
              <p className="text-[10px] text-[#5a7a64] truncate leading-tight">{strategy.description}</p>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onToggleEdit}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
            isEditing
              ? 'bg-[#f97316] text-black'
              : 'bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c]'
          }`}
        >
          {isEditing ? <Edit3 size={11} /> : <Eye size={11} />}
          {isEditing ? 'Editing' : 'Edit'}
        </button>

        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c] text-[11px] font-bold uppercase tracking-wider transition-all"
        >
          <Plus size={11} />
          New
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c] text-[11px] font-bold uppercase tracking-wider transition-all"
        >
          <Save size={11} />
          Save
        </button>

        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#22c55e] hover:bg-[#16a34a] text-black text-[11px] font-black uppercase tracking-wider transition-all"
        >
          <Share2 size={11} />
          Share
        </button>

        {/* Settings gear — always visible */}
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-8 h-8 rounded bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c] transition-all"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>

        {/* Auth area */}
        {!loading && (
          <>
            {user ? (
              <UserMenu onOpenSettings={onOpenSettings} />
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1a2d22] text-[#7a9882] hover:text-white hover:bg-[#243d2c] text-[11px] font-bold uppercase tracking-wider transition-all"
              >
                Sign In
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
