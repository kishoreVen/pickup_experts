'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Strategy } from '@/lib/types';
import { EXAMPLE_STRATEGY, encodeStrategy, decodeStrategy } from '@/lib/strategyUtils';
import Header from '@/components/Header';
import SoccerPitch from '@/components/SoccerPitch';
import AnimationControls from '@/components/AnimationControls';
import PromptPanel from '@/components/PromptPanel';
import AuthModal from '@/components/AuthModal';
import SettingsModal from '@/components/SettingsModal';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, supabase, refreshProfile } = useAuth();

  const [strategy, setStrategy] = useState<Strategy>(EXAMPLE_STRATEGY);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number | undefined>(undefined);

  // ── Animation loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = undefined;
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current !== undefined) {
        const delta = (ts - lastTsRef.current) * playbackSpeed;
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= strategy.duration) {
            setIsPlaying(false);
            return strategy.duration;
          }
          return next;
        });
      }
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, playbackSpeed, strategy.duration]);

  // ── Load strategy from URL hash ─────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#strategy=')) {
      try {
        const decoded = decodeStrategy(hash.slice('#strategy='.length));
        setStrategy(decoded);
      } catch {
        console.warn('Could not parse strategy from URL hash');
      }
    }
  }, []);

  // ── Handle ?subscription=success ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      showToast('Welcome to Pro! 🎉');
      refreshProfile();
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('subscription');
      window.history.replaceState(null, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const callAPI = async (prompt: string, existing?: Strategy, apiKey?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await fetch('/api/generate-strategy', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, existingStrategy: existing }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Surface helpful auth/subscription messages
        const msg = data.message || data.error || 'Failed to generate strategy';
        throw new Error(msg);
      }
      setStrategy(data.strategy as Strategy);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = useCallback(
    (prompt: string, apiKey?: string) => callAPI(prompt, undefined, apiKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleRefine = useCallback(
    (prompt: string, apiKey?: string) => callAPI(prompt, strategy, apiKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strategy]
  );

  const handleLoadStrategy = useCallback((s: Strategy) => {
    setStrategy(s);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handlePlayerMove = useCallback((playerId: string, x: number, y: number) => {
    setStrategy(prev => ({
      ...prev,
      players: prev.players.map(p => {
        if (p.id !== playerId) return p;
        const kf = [...p.keyframes];
        kf[0] = { ...kf[0], x, y };
        return { ...p, keyframes: kf };
      }),
    }));
  }, []);

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}#strategy=${encodeStrategy(strategy)}`;
    navigator.clipboard
      .writeText(url)
      .then(() => showToast('Link copied to clipboard!'))
      .catch(() => showToast('Copy failed — check browser permissions'));
  };

  const handleSave = async () => {
    if (user) {
      // Save to Supabase
      try {
        const payload = {
          user_id: user.id,
          title: strategy.title,
          description: strategy.description,
          strategy_json: strategy,
          updated_at: new Date().toISOString(),
        };

        if (strategy.id && !strategy.id.startsWith('strategy_') && !strategy.id.startsWith('demo')) {
          // Update existing Supabase row
          const { error: upsertError } = await supabase
            .from('strategies')
            .update({ ...payload })
            .eq('id', strategy.id)
            .eq('user_id', user.id);
          if (upsertError) throw upsertError;
        } else {
          // Insert new row and capture the UUID
          const { data, error: insertError } = await supabase
            .from('strategies')
            .insert(payload)
            .select('id')
            .single();
          if (insertError) throw insertError;
          if (data?.id) {
            setStrategy(prev => ({ ...prev, id: data.id }));
          }
        }
        showToast('Strategy saved!');
      } catch (err: unknown) {
        console.error('[handleSave]', err);
        showToast('Could not save to cloud');
      }
    } else {
      // Guest — localStorage fallback
      try {
        const saved: Strategy[] = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
        const updated = [{ ...strategy, savedAt: new Date().toISOString() }, ...saved].slice(0, 20);
        localStorage.setItem('savedStrategies', JSON.stringify(updated));
        showToast('Strategy saved locally!');
      } catch {
        showToast('Could not save — localStorage unavailable');
      }
    }
  };

  const handleNew = () => {
    setStrategy(EXAMPLE_STRATEGY);
    setCurrentTime(0);
    setIsPlaying(false);
    setError(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handlePlay = () => {
    if (currentTime >= strategy.duration) setCurrentTime(0);
    setIsPlaying(true);
  };

  return (
    <div className="h-screen flex flex-col bg-[#080e0c] text-white overflow-hidden">
      {/* ── Top bar ── */}
      <Header
        strategy={strategy}
        isEditing={isEditing}
        onShare={handleShare}
        onSave={handleSave}
        onNew={handleNew}
        onToggleEdit={() => setIsEditing(e => !e)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Pitch + controls */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Pitch fills remaining space */}
          <div className="flex-1 min-h-0 p-3">
            <SoccerPitch
              strategy={strategy}
              currentTime={currentTime}
              isEditing={isEditing}
              onPlayerMove={handlePlayerMove}
            />
          </div>

          {/* Animation controls bar */}
          <AnimationControls
            duration={strategy.duration}
            currentTime={currentTime}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onPlay={handlePlay}
            onPause={() => setIsPlaying(false)}
            onSeek={t => { setCurrentTime(t); setIsPlaying(false); }}
            onSpeedChange={setPlaybackSpeed}
          />
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-[#1a2d22] flex-shrink-0 overflow-hidden">
          <PromptPanel
            strategy={strategy}
            isLoading={isLoading}
            error={error}
            onGenerate={handleGenerate}
            onRefine={handleRefine}
            onLoadStrategy={handleLoadStrategy}
          />
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-[#22c55e] text-black text-[11px] font-black uppercase tracking-wider shadow-xl shadow-green-900/40 pointer-events-none">
          {toast}
        </div>
      )}

      {/* ── Modals ── */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onOpenAuth={() => { setShowSettings(false); setShowAuthModal(true); }}
        />
      )}
    </div>
  );
}
