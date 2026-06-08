'use client';

import { useState, useEffect } from 'react';
import { Loader2, Wand2, RefreshCw, ChevronDown, ChevronUp, Trash2, Shuffle } from 'lucide-react';
import { GameMode, Strategy } from '@/lib/types';
import { getFormation } from '@/lib/strategyUtils';
import { useSettings } from '@/hooks/useSettings';


interface PromptPanelProps {
  strategy: Strategy;
  isLoading: boolean;
  error: string | null;
  gameMode: GameMode;
  homeAttacksRight: boolean;
  onGameModeChange: (mode: GameMode) => void;
  onToggleDirection: () => void;
  onGenerate: (prompt: string, apiKey?: string) => void;
  onRefine: (prompt: string, apiKey?: string) => void;
  onRandomize: (apiKey?: string) => void;
  generatedQuery?: string;
  onLoadStrategy: (strategy: Strategy) => void;
}

const EXAMPLES: Record<GameMode, string[]> = {
  '5v5': [
    'GK plays short to CM, drives forward, releases ST who finishes low',
    'Quick one-two to beat the press, burst down the right, low cross',
    'Win the ball high up, immediate 3v2 counter to goal',
    'Set piece: short corner, overlapping run, first-time finish',
  ],
  '3v3': [
    'GK kick-out triggers a 2v1 overload — defender to striker',
    'High press to win possession, direct run, finish near post',
    'One-two wall pass past the last defender, composed finish',
    'Absorb pressure deep, quick turnover, fast break 2v1',
  ],
  '1v1': [
    'Drive at goal, feint left, cut right, curl to far corner',
    'Receive back to goal, sharp turn, low shot near post',
    'Step-over to create space, compose, place it far corner',
    'Burst of pace, shift inside, strike with instep',
  ],
};

type Tab = 'generate' | 'refine' | 'plays';

export default function PromptPanel({
  strategy,
  isLoading,
  error,
  gameMode,
  homeAttacksRight,
  onGameModeChange,
  onToggleDirection,
  onGenerate,
  onRefine,
  onRandomize,
  generatedQuery,
  onLoadStrategy,
}: PromptPanelProps) {
  const { apiKey } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [tab, setTab] = useState<Tab>('generate');
  const [showPlayers, setShowPlayers] = useState(false);
  const [plays, setPlays] = useState<Strategy[]>([]);

  const homePlayers = strategy.players.filter(p => p.team === 'home');
  const awayPlayers = strategy.players.filter(p => p.team === 'away');
  const homeFormation = getFormation(strategy.players, 'home');
  const awayFormation = getFormation(strategy.players, 'away');

  useEffect(() => {
    if (tab !== 'plays') return;
    try {
      const saved: Strategy[] = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
      setPlays(saved);
    } catch { setPlays([]); }
  }, [tab]);

  useEffect(() => {
    if (generatedQuery) setPrompt(generatedQuery);
  }, [generatedQuery]);

  const handleDeletePlay = (id: string) => {
    try {
      const saved: Strategy[] = JSON.parse(localStorage.getItem('savedStrategies') || '[]');
      localStorage.setItem('savedStrategies', JSON.stringify(saved.filter(s => s.id !== id)));
      setPlays(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    if (tab === 'refine') {
      onRefine(prompt.trim(), apiKey || undefined);
    } else {
      onGenerate(prompt.trim(), apiKey || undefined);
    }
    setPrompt('');
  };

  const isDemo = strategy.id === 'demo';

  return (
    <div className="h-full flex flex-col bg-[#0c1710] overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1a2d22] flex-shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[10px] font-black text-[#22c55e] uppercase tracking-widest">AI Coach</span>
        </div>

        {/* Strategy info */}
        <div className="space-y-1.5">
          {/* Formations */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-[11px] font-black text-white">{homeFormation}</span>
              <span className="text-[10px] text-[#5a7a64] uppercase tracking-wider">Home</span>
            </div>
            <span className="text-[#1a2d22]">·</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[11px] font-black text-white">{awayFormation}</span>
              <span className="text-[10px] text-[#5a7a64] uppercase tracking-wider">Away</span>
            </div>
          </div>

          {/* Player toggle */}
          <button
            onClick={() => setShowPlayers(!showPlayers)}
            className="flex items-center gap-1 text-[10px] text-[#22c55e] hover:text-white transition-colors"
          >
            {showPlayers ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {showPlayers ? 'Hide' : 'Show'} players
          </button>

          {showPlayers && (
            <div className="pt-1 space-y-2">
              <PlayerList label="Home" color="#ef4444" players={homePlayers} />
              <PlayerList label="Away" color="#3b82f6" players={awayPlayers} />
            </div>
          )}
        </div>
      </div>

      {/* ── Game mode selector ── */}
      <div className="px-4 py-2 border-b border-[#1a2d22] flex-shrink-0">
        <p className="text-[9px] font-black text-[#3a5a44] uppercase tracking-widest mb-1.5">Mode</p>
        <div className="flex gap-1">
          {(['5v5', '3v3', '1v1'] as GameMode[]).map(m => (
            <button
              key={m}
              onClick={() => onGameModeChange(m)}
              className={`flex-1 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                gameMode === m
                  ? 'bg-[#22c55e] text-black'
                  : 'bg-[#0e1a15] border border-[#1a2d22] text-[#5a7a64] hover:text-white hover:border-[#22c55e]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-[#3a5a44] mt-1 leading-relaxed">
          {gameMode === '5v5' && '5 outfield + 1 GK each'}
          {gameMode === '3v3' && '3 outfield + 1 GK each'}
          {gameMode === '1v1' && 'No GK — small goals'}
        </p>
      </div>

      {/* ── Attack direction ── */}
      <div className="px-4 py-2 border-b border-[#1a2d22] flex-shrink-0">
        <p className="text-[9px] font-black text-[#3a5a44] uppercase tracking-widest mb-1.5">Attack Direction</p>
        <button
          onClick={onToggleDirection}
          title="Swap which side each team attacks"
          className="w-full flex items-center justify-between bg-[#0e1a15] border border-[#1a2d22] hover:border-[#22c55e] rounded-lg px-3 py-1.5 transition-colors group"
        >
          {/* left side */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: homeAttacksRight ? '#ef4444' : '#3b82f6' }} />
            <span className="text-[10px] font-black" style={{ color: homeAttacksRight ? '#ef4444' : '#3b82f6' }}>
              {homeAttacksRight ? 'RED' : 'BLUE'}
            </span>
          </div>
          {/* mini pitch */}
          <div className="flex items-center gap-0.5 text-[9px] font-black text-[#3a5a44]">
            <span>{homeAttacksRight ? '→' : '←'}</span>
            <span className="px-1 border-x border-[#1a2d22] mx-0.5 text-[#22c55e] group-hover:text-white transition-colors">⇄</span>
            <span>{homeAttacksRight ? '←' : '→'}</span>
          </div>
          {/* right side */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black" style={{ color: homeAttacksRight ? '#3b82f6' : '#ef4444' }}>
              {homeAttacksRight ? 'BLUE' : 'RED'}
            </span>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: homeAttacksRight ? '#3b82f6' : '#ef4444' }} />
          </div>
        </button>
      </div>

      {/* ── Mode tabs ── */}
      <div className="flex border-b border-[#1a2d22] flex-shrink-0">
        <TabButton
          active={tab === 'generate'}
          activeColor="#22c55e"
          onClick={() => setTab('generate')}
          label="New Play"
        />
        <TabButton
          active={tab === 'refine'}
          activeColor="#f97316"
          onClick={() => setTab('refine')}
          label="Refine"
          disabled={isDemo}
        />
        <TabButton
          active={tab === 'plays'}
          activeColor="#3b82f6"
          onClick={() => setTab('plays')}
          label="My Plays"
        />
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'generate' && (
          <div>
            <p className="text-[10px] font-bold text-[#3a5a44] uppercase tracking-widest mb-2">
              Try one of these:
            </p>
            <div className="space-y-1">
              {EXAMPLES[gameMode].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="w-full text-left text-[11px] text-[#7a9882] hover:text-white hover:bg-[#1a2d22] px-2.5 py-2 rounded transition-colors leading-relaxed"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'refine' && !isDemo && (
          <div>
            <p className="text-[10px] font-bold text-[#3a5a44] uppercase tracking-widest mb-2">
              Refinement ideas:
            </p>
            <div className="space-y-1">
              {[
                'Make the striker stay higher up the pitch',
                'Add an overlapping run from the left back',
                'Show more passing combinations before the shot',
                'Make the defensive shape tighter',
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="w-full text-left text-[11px] text-[#7a9882] hover:text-white hover:bg-[#1a2d22] px-2.5 py-2 rounded transition-colors leading-relaxed"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'plays' && (
          <div>
            {plays.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[12px] text-[#5a7a64] leading-relaxed">
                  No saved plays yet. Generate a strategy and hit Save!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {plays.map(play => (
                  <div key={play.id} className="bg-[#0e1a15] border border-[#1a2d22] rounded-lg p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-white truncate leading-tight">{play.title}</p>
                        {play.description && (
                          <p className="text-[10px] text-[#5a7a64] mt-0.5 leading-relaxed line-clamp-2">{play.description}</p>
                        )}
                        {play.createdAt && (
                          <p className="text-[9px] text-[#3a5a44] mt-1 uppercase tracking-wider">
                            {new Date(play.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onLoadStrategy(play)}
                          className="px-2.5 py-1 rounded bg-[#22c55e] hover:bg-[#16a34a] text-black text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeletePlay(play.id)}
                          className="p-1 rounded text-[#3a5a44] hover:text-red-400 hover:bg-[#1a2d22] transition-all"
                          aria-label="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 mb-3 px-3 py-2 bg-red-950/50 border border-red-800/50 rounded-lg text-[11px] text-red-400 leading-relaxed flex-shrink-0">
          {error}
        </div>
      )}

      {/* ── Input (hidden on My Plays tab) ── */}
      {tab !== 'plays' && (
        <div className="px-4 pt-2 pb-4 border-t border-[#1a2d22] flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                tab === 'refine'
                  ? 'What would you like to change?'
                  : 'Describe your play or scenario…'
              }
              rows={3}
              className="w-full bg-[#0e1a15] border border-[#1a2d22] rounded-lg px-3 py-2.5 text-[12px] text-white placeholder-[#3a5a44] focus:outline-none focus:border-[#22c55e] resize-none leading-relaxed transition-colors"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                style={{
                  background: isLoading
                    ? '#1a2d22'
                    : tab === 'refine'
                    ? '#f97316'
                    : '#22c55e',
                  color: isLoading ? '#5a7a64' : '#000',
                }}
                className="flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Generating…
                  </>
                ) : tab === 'refine' ? (
                  <>
                    <RefreshCw size={12} />
                    Refine
                  </>
                ) : (
                  <>
                    <Wand2 size={12} />
                    Generate
                  </>
                )}
              </button>

              {tab === 'generate' && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onRandomize(apiKey || undefined)}
                  title="Generate a random play"
                  className="px-3 py-2.5 rounded-lg border border-[#1a2d22] text-[#5a7a64] hover:text-white hover:border-[#22c55e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Shuffle size={13} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  activeColor,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  activeColor: string;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'border-b-2 text-white' : 'text-[#5a7a64] hover:text-white'
      }`}
      style={active ? { borderColor: activeColor, color: activeColor } : {}}
    >
      {label}
    </button>
  );
}

function PlayerList({
  label,
  color,
  players,
}: {
  label: string;
  color: string;
  players: { id: string; number: number; role: string }[];
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color }}>
        {label}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {players.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <span
              className="inline-flex w-4 h-4 rounded-full items-center justify-center text-[9px] font-black text-white flex-shrink-0"
              style={{ background: color }}
            >
              {p.number}
            </span>
            <span className="text-[10px] text-[#7a9882]">{p.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
