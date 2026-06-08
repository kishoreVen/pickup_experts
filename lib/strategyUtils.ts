import { Keyframe, Strategy } from './types';

// ─── Math helpers ────────────────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function interpolatePosition(
  keyframes: Keyframe[],
  time: number
): { x: number; y: number } {
  if (!keyframes || keyframes.length === 0) return { x: 0.5, y: 0.5 };
  if (keyframes.length === 1) return { x: keyframes[0].x, y: keyframes[0].y };
  if (time <= keyframes[0].time) return { x: keyframes[0].x, y: keyframes[0].y };

  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return { x: last.x, y: last.y };

  for (let i = 0; i < keyframes.length - 1; i++) {
    const curr = keyframes[i];
    const next = keyframes[i + 1];
    if (time >= curr.time && time <= next.time) {
      const t = (time - curr.time) / (next.time - curr.time);
      const eased = easeInOut(t);
      return { x: lerp(curr.x, next.x, eased), y: lerp(curr.y, next.y, eased) };
    }
  }

  return { x: keyframes[0].x, y: keyframes[0].y };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ─── Share / Save ─────────────────────────────────────────────────────────────

export function encodeStrategy(strategy: Strategy): string {
  return btoa(encodeURIComponent(JSON.stringify(strategy)));
}

export function decodeStrategy(encoded: string): Strategy {
  return JSON.parse(decodeURIComponent(atob(encoded)));
}

// ─── Formation inference ──────────────────────────────────────────────────────

const DEF_ROLES = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);
const MID_ROLES = new Set(['CDM', 'CM', 'CAM', 'LM', 'RM', 'DM']);
const ATT_ROLES = new Set(['LW', 'RW', 'ST', 'CF', 'SS', 'FW']);

export function getFormation(
  players: { role: string; team: string }[],
  team: 'home' | 'away'
): string {
  const tp = players.filter(p => p.team === team && p.role !== 'GK');
  const d = tp.filter(p => DEF_ROLES.has(p.role)).length;
  const m = tp.filter(p => MID_ROLES.has(p.role)).length;
  const a = tp.filter(p => ATT_ROLES.has(p.role)).length;
  if (d > 0 && m > 0 && a > 0) return `${d}-${m}-${a}`;
  return '—';
}

// ─── Demo strategy (5v5) ──────────────────────────────────────────────────────

export const EXAMPLE_STRATEGY: Strategy = {
  id: 'demo',
  title: 'Quick Counter — 5v5',
  description: 'GK plays short to CM, drives forward, releases ST who finishes low.',
  duration: 7000,
  gameMode: '5v5',
  outcome: 'goal_clean',
  scoringTeam: 'home',
  players: [
    // HOME (red) — 1 GK + 2 CB + 1 CM + 2 ST — attacks right
    { id: 'h1', number: 1,  role: 'GK', playRole: 'gk_active',   team: 'home', keyframes: [{ time: 0, x: 0.04, y: 0.50 }, { time: 1400, x: 0.08, y: 0.50 }] },
    { id: 'h2', number: 5,  role: 'CB', playRole: 'cover',        team: 'home', keyframes: [{ time: 0, x: 0.22, y: 0.34 }, { time: 7000, x: 0.26, y: 0.34 }] },
    { id: 'h3', number: 6,  role: 'CB', playRole: 'cover',        team: 'home', keyframes: [{ time: 0, x: 0.22, y: 0.66 }, { time: 7000, x: 0.26, y: 0.66 }] },
    { id: 'h4', number: 8,  role: 'CM', playRole: 'ball_carrier', team: 'home', keyframes: [{ time: 0, x: 0.38, y: 0.50 }, { time: 1800, x: 0.50, y: 0.48 }, { time: 3800, x: 0.64, y: 0.44 }] },
    { id: 'h5', number: 9,  role: 'ST', playRole: 'target_run',   team: 'home', keyframes: [{ time: 0, x: 0.52, y: 0.32 }, { time: 3500, x: 0.67, y: 0.40 }, { time: 5800, x: 0.84, y: 0.34 }, { time: 6800, x: 0.92, y: 0.42 }] },
    { id: 'h6', number: 10, role: 'ST', playRole: 'support_run',  team: 'home', keyframes: [{ time: 0, x: 0.52, y: 0.68 }, { time: 4000, x: 0.66, y: 0.66 }, { time: 7000, x: 0.76, y: 0.60 }] },

    // AWAY (blue) — 1 GK + 2 CB + 1 CM + 2 ST — attacks left
    { id: 'a1', number: 1,  role: 'GK', playRole: 'gk_passive', team: 'away', keyframes: [{ time: 0, x: 0.96, y: 0.50 }, { time: 5800, x: 0.94, y: 0.48 }] },
    { id: 'a2', number: 5,  role: 'CB', playRole: 'track',      team: 'away', keyframes: [{ time: 0, x: 0.78, y: 0.34 }, { time: 7000, x: 0.80, y: 0.32 }] },
    { id: 'a3', number: 6,  role: 'CB', playRole: 'cover',      team: 'away', keyframes: [{ time: 0, x: 0.78, y: 0.66 }, { time: 5000, x: 0.80, y: 0.68 }] },
    { id: 'a4', number: 8,  role: 'CM', playRole: 'press',      team: 'away', keyframes: [{ time: 0, x: 0.62, y: 0.50 }, { time: 3500, x: 0.68, y: 0.52 }] },
    { id: 'a5', number: 9,  role: 'ST', playRole: 'press',      team: 'away', keyframes: [{ time: 0, x: 0.48, y: 0.34 }, { time: 4000, x: 0.55, y: 0.36 }] },
    { id: 'a6', number: 10, role: 'ST', playRole: 'cover',      team: 'away', keyframes: [{ time: 0, x: 0.48, y: 0.66 }, { time: 4000, x: 0.55, y: 0.64 }] },
  ],
  ball: {
    keyframes: [
      { time: 0,    x: 0.04, y: 0.50 },
      { time: 1400, x: 0.38, y: 0.50, event: 'pass' },
      { time: 3500, x: 0.67, y: 0.40, event: 'pass' },
      { time: 5800, x: 0.84, y: 0.34, event: 'dribble' },
      { time: 6800, x: 0.93, y: 0.44, event: 'shot' },
      { time: 7000, x: 1.03, y: 0.47 },  // ball crosses fully into the net
    ],
  },
};
