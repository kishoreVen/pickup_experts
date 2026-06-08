'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, Strategy } from '@/lib/types';
import { EXAMPLE_STRATEGY, encodeStrategy, decodeStrategy } from '@/lib/strategyUtils';
import Header from '@/components/Header';
import SoccerPitch from '@/components/SoccerPitch';
import AnimationControls from '@/components/AnimationControls';
import PromptPanel from '@/components/PromptPanel';
import SettingsModal from '@/components/SettingsModal';

/**
 * Scans a prompt for natural-language attack-direction cues.
 * Returns true (home attacks right), false (home attacks left), or null (no cue found).
 * Examples: "red attacks left", "home going right", "blue attacks right"
 */
function parseAttackDirection(prompt: string): boolean | null {
  const p = prompt.toLowerCase();
  if (/(home|red).{0,25}(attack|go|play|start).{0,10}right/.test(p)) return true;
  if (/(home|red).{0,25}(attack|go|play|start).{0,10}left/.test(p))  return false;
  if (/(away|blue).{0,25}(attack|go|play|start).{0,10}left/.test(p)) return true;
  if (/(away|blue).{0,25}(attack|go|play|start).{0,10}right/.test(p)) return false;
  return null;
}

export default function Home() {
  const [strategy, setStrategy] = useState<Strategy>(EXAMPLE_STRATEGY);
  const [gameMode, setGameMode] = useState<GameMode>('5v5');
  const [homeAttacksRight, setHomeAttacksRight] = useState(true);
  const gameModeRef        = useRef<GameMode>('5v5');
  const homeAttacksRightRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [generatedQuery, setGeneratedQuery] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);

  const rafRef    = useRef<number>(0);
  const lastTsRef = useRef<number | undefined>(undefined);

  // Keep refs in sync so callAPI always sees the latest values
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { homeAttacksRightRef.current = homeAttacksRight; }, [homeAttacksRight]);

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
        if (decoded.gameMode) setGameMode(decoded.gameMode);
      } catch {
        console.warn('Could not parse strategy from URL hash');
      }
    }
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const callAPI = async (prompt: string, existing?: Strategy, apiKey?: string) => {
    // Detect attack direction from natural language before the async state update lands
    const detected = parseAttackDirection(prompt);
    if (detected !== null) {
      homeAttacksRightRef.current = detected;
      setHomeAttacksRight(detected);
    }

    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await fetch('/api/generate-strategy', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          existingStrategy: existing,
          gameMode: gameModeRef.current,
          homeAttacksRight: homeAttacksRightRef.current,
        }),
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

  const handleRandomize = useCallback(async (apiKey?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;
      const res = await fetch('/api/random-query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ gameMode: gameModeRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get random query');
      const query = data.query as string;
      setGeneratedQuery(query);
      await callAPI(query, undefined, apiKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to randomize');
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadStrategy = useCallback((s: Strategy) => {
    setStrategy(s);
    if (s.gameMode) setGameMode(s.gameMode);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);


  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}#strategy=${encodeStrategy(strategy)}`;
    navigator.clipboard
      .writeText(url)
      .then(() => showToast('Link copied to clipboard!'))
      .catch(() => showToast('Copy failed — check browser permissions'));
  };

  const handleSave = () => {
    try {
      const saved: Strategy[] = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
      const updated = [{ ...strategy, createdAt: new Date().toISOString() }, ...saved.filter(s => s.id !== strategy.id)].slice(0, 20);
      localStorage.setItem('savedStrategies', JSON.stringify(updated));
      showToast('Strategy saved!');
    } catch {
      showToast('Could not save — localStorage unavailable');
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
        onShare={handleShare}
        onSave={handleSave}
        onNew={handleNew}
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
              isEditing={false}
              gameMode={gameMode}
              homeAttacksRight={homeAttacksRight}
              onPlayerMove={() => {}}
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
            gameMode={gameMode}
            homeAttacksRight={homeAttacksRight}
            onGameModeChange={setGameMode}
            onToggleDirection={() => setHomeAttacksRight(v => !v)}
            onGenerate={handleGenerate}
            onRefine={handleRefine}
            onRandomize={handleRandomize}
            generatedQuery={generatedQuery}
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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
