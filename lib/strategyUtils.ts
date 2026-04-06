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

// ─── Demo strategy ────────────────────────────────────────────────────────────

export const EXAMPLE_STRATEGY: Strategy = {
  id: 'demo',
  title: 'Quick Counter — Right Wing',
  description:
    'GK distribution triggers a fast break down the right, ending with a far-post cross and header.',
  duration: 9000,
  players: [
    // HOME (red) — 4-3-3 — attacks right (x → 1.0)
    { id: 'h1',  number: 1,  role: 'GK',  team: 'home', keyframes: [{ time: 0, x: 0.04, y: 0.50 }] },
    { id: 'h2',  number: 2,  role: 'RB',  team: 'home', keyframes: [{ time: 0, x: 0.20, y: 0.78 }, { time: 2500, x: 0.42, y: 0.84 }, { time: 6000, x: 0.72, y: 0.90 }, { time: 8500, x: 0.86, y: 0.86 }] },
    { id: 'h3',  number: 5,  role: 'CB',  team: 'home', keyframes: [{ time: 0, x: 0.20, y: 0.38 }, { time: 9000, x: 0.28, y: 0.38 }] },
    { id: 'h4',  number: 6,  role: 'CB',  team: 'home', keyframes: [{ time: 0, x: 0.20, y: 0.62 }, { time: 9000, x: 0.28, y: 0.62 }] },
    { id: 'h5',  number: 3,  role: 'LB',  team: 'home', keyframes: [{ time: 0, x: 0.20, y: 0.22 }, { time: 9000, x: 0.26, y: 0.22 }] },
    { id: 'h6',  number: 4,  role: 'CDM', team: 'home', keyframes: [{ time: 0, x: 0.34, y: 0.50 }, { time: 9000, x: 0.44, y: 0.50 }] },
    { id: 'h7',  number: 8,  role: 'CM',  team: 'home', keyframes: [{ time: 0, x: 0.40, y: 0.30 }, { time: 4000, x: 0.54, y: 0.28 }, { time: 9000, x: 0.64, y: 0.26 }] },
    { id: 'h8',  number: 10, role: 'CM',  team: 'home', keyframes: [{ time: 0, x: 0.40, y: 0.68 }, { time: 4000, x: 0.55, y: 0.62 }, { time: 9000, x: 0.65, y: 0.58 }] },
    { id: 'h9',  number: 7,  role: 'RW',  team: 'home', keyframes: [{ time: 0, x: 0.48, y: 0.85 }, { time: 3500, x: 0.66, y: 0.92 }, { time: 7000, x: 0.82, y: 0.90 }] },
    { id: 'h10', number: 9,  role: 'ST',  team: 'home', keyframes: [{ time: 0, x: 0.50, y: 0.50 }, { time: 4000, x: 0.65, y: 0.40 }, { time: 7500, x: 0.80, y: 0.35 }, { time: 8800, x: 0.88, y: 0.38 }] },
    { id: 'h11', number: 11, role: 'LW',  team: 'home', keyframes: [{ time: 0, x: 0.48, y: 0.15 }, { time: 9000, x: 0.70, y: 0.20 }] },

    // AWAY (blue) — 4-4-2 — attacks left (x → 0.0)
    { id: 'a1',  number: 1,  role: 'GK',  team: 'away', keyframes: [{ time: 0, x: 0.96, y: 0.50 }, { time: 8000, x: 0.94, y: 0.46 }] },
    { id: 'a2',  number: 2,  role: 'RB',  team: 'away', keyframes: [{ time: 0, x: 0.76, y: 0.20 }, { time: 9000, x: 0.74, y: 0.22 }] },
    { id: 'a3',  number: 5,  role: 'CB',  team: 'away', keyframes: [{ time: 0, x: 0.80, y: 0.36 }, { time: 6000, x: 0.82, y: 0.34 }] },
    { id: 'a4',  number: 6,  role: 'CB',  team: 'away', keyframes: [{ time: 0, x: 0.80, y: 0.64 }, { time: 6000, x: 0.82, y: 0.66 }] },
    { id: 'a5',  number: 3,  role: 'LB',  team: 'away', keyframes: [{ time: 0, x: 0.76, y: 0.80 }, { time: 4000, x: 0.80, y: 0.84 }, { time: 9000, x: 0.84, y: 0.88 }] },
    { id: 'a6',  number: 8,  role: 'CM',  team: 'away', keyframes: [{ time: 0, x: 0.66, y: 0.35 }, { time: 4000, x: 0.70, y: 0.36 }] },
    { id: 'a7',  number: 4,  role: 'CDM', team: 'away', keyframes: [{ time: 0, x: 0.66, y: 0.58 }, { time: 4000, x: 0.70, y: 0.60 }] },
    { id: 'a8',  number: 7,  role: 'RM',  team: 'away', keyframes: [{ time: 0, x: 0.62, y: 0.18 }, { time: 4000, x: 0.66, y: 0.20 }] },
    { id: 'a9',  number: 11, role: 'LM',  team: 'away', keyframes: [{ time: 0, x: 0.62, y: 0.80 }, { time: 4000, x: 0.70, y: 0.82 }] },
    { id: 'a10', number: 9,  role: 'ST',  team: 'away', keyframes: [{ time: 0, x: 0.57, y: 0.42 }, { time: 5000, x: 0.60, y: 0.43 }] },
    { id: 'a11', number: 10, role: 'ST',  team: 'away', keyframes: [{ time: 0, x: 0.57, y: 0.58 }, { time: 5000, x: 0.60, y: 0.57 }] },
  ],
  ball: {
    keyframes: [
      { time: 0,    x: 0.04, y: 0.50 },
      { time: 1500, x: 0.20, y: 0.78, event: 'pass' },
      { time: 4000, x: 0.66, y: 0.90, event: 'dribble' },
      { time: 6500, x: 0.82, y: 0.90, event: 'cross' },
      { time: 8200, x: 0.88, y: 0.38, event: 'shot' },
      { time: 9000, x: 0.96, y: 0.40 },
    ],
  },
};
