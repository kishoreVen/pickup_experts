'use client';

import { useState, useEffect } from 'react';
import { Loader2, Wand2, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Strategy } from '@/lib/types';
import { getFormation } from '@/lib/strategyUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';

interface SavedStrategyRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  strategy_json: Strategy;
}

interface PromptPanelProps {
  strategy: Strategy;
  isLoading: boolean;
  error: string | null;
  onGenerate: (prompt: string, apiKey?: string) => void;
  onRefine: (prompt: string, apiKey?: string) => void;
  onLoadStrategy: (strategy: Strategy) => void;
}

const EXAMPLES = [
  '4-3-3 high press: regain the ball in midfield then launch a quick counter',
  'Corner kick — near-post run, far-post header, rebound option at the edge',
  '3-5-2 overlapping wingbacks combine down the left to cross into the box',
  'Low block 5-4-1, intercept in the half, release the striker on the break',
  'Tiki-taka sequence: 10 passes through the lines, open up space for a shot',
];

type Tab = 'generate' | 'refine' | 'plays';

export default function PromptPanel({
  strategy,
  isLoading,
  error,
  onGenerate,
  onRefine,
  onLoadStrategy,
}: PromptPanelProps) {
  const { user, supabase } = useAuth();
  const { apiKey } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [tab, setTab] = useState<Tab>('generate');
  const [showPlayers, setShowPlayers] = useState(false);

  // My Plays state
  const [plays, setPlays] = useState<SavedStrategyRow[]>([]);
  const [playsLoading, setPlaysLoading] = useState(false);

  const homePlayers = strategy.players.filter(p => p.team === 'home');
  const awayPlayers = strategy.players.filter(p => p.team === 'away');
  const homeFormation = getFormation(strategy.players, 'home');
  const awayFormation = getFormation(strategy.players, 'away');

  // Fetch strategies when My Plays tab is active
  useEffect(() => {
    if (tab !== 'plays' || !user) return;

    const fetchPlays = async () => {
      setPlaysLoading(true);
      try {
        const { data } = await supabase
          .from('strategies')
          .select('id, title, description, created_at, strategy_json')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);
        setPlays((data as SavedStrategyRow[]) ?? []);
      } finally {
        setPlaysLoading(false);
      }
    };

    fetchPlays();
  }, [tab, user, supabase]);

  const handleDeletePlay = async (id: string) => {
    await supabase.from('strategies').delete().eq('id', id);
    setPlays(prev => prev.filter(p => p.id !== id));
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
              {EXAMPLES.map((ex, i) => (
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
            {!user ? (
              <div className="text-center py-8">
                <p className="text-[12px] text-[#5a7a64] leading-relaxed">
                  Sign in to save and load strategies.
                </p>
              </div>
            ) : playsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-[#22c55e]" />
              </div>
            ) : plays.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[12px] text-[#5a7a64] leading-relaxed">
                  No saved plays yet. Generate a strategy and save it!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {plays.map(play => (
                  <div
                    key={play.id}
                    className="bg-[#0e1a15] border border-[#1a2d22] rounded-lg p-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-white truncate leading-tight">
                          {play.title}
                        </p>
                        {play.description && (
                          <p className="text-[10px] text-[#5a7a64] mt-0.5 leading-relaxed line-clamp-2">
                            {play.description}
                          </p>
                        )}
                        <p className="text-[9px] text-[#3a5a44] mt-1 uppercase tracking-wider">
                          {new Date(play.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onLoadStrategy(play.strategy_json)}
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
              className="w-full mt-2 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Generating…
                </>
              ) : tab === 'refine' ? (
                <>
                  <RefreshCw size={12} />
                  Refine Play
                </>
              ) : (
                <>
                  <Wand2 size={12} />
                  Generate Play
                </>
              )}
            </button>
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
