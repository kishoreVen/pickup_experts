'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserMenuProps {
  onOpenSettings: () => void;
}

export default function UserMenu({ onOpenSettings }: UserMenuProps) {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const email = user.email ?? '';
  const initials = email.slice(0, 2).toUpperCase();
  const isPro = profile?.subscription_tier === 'pro';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#1a2d22] transition-all"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#22c55e] flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-black text-black">{initials}</span>
          )}
        </div>

        {isPro && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#f97316] text-black">
            Pro
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#0e1a15] border border-[#1a2d22] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-[#1a2d22]">
            <p className="text-[11px] font-bold text-white truncate">{email}</p>
            {isPro ? (
              <p className="text-[10px] text-[#f97316] font-black uppercase tracking-wider mt-0.5">Pro Member</p>
            ) : (
              <p className="text-[10px] text-[#5a7a64] uppercase tracking-wider mt-0.5">Free Plan</p>
            )}
          </div>

          {/* Menu items */}
          <div className="p-1">
            <button
              onClick={() => { setOpen(false); onOpenSettings(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] text-[#7a9882] hover:text-white hover:bg-[#1a2d22] transition-colors uppercase tracking-wider font-bold text-left"
            >
              <span>⚙</span>
              Settings
            </button>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] text-[#7a9882] hover:text-red-400 hover:bg-[#1a2d22] transition-colors uppercase tracking-wider font-bold text-left"
            >
              <span>↪</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
