import { BallTrack, PlayerData } from './types';
import { interpolatePosition } from './strategyUtils';

/**
 * Converts an array of 2-D points to a smooth SVG path string using
 * Catmull-Rom splines (converted to cubic bezier segments).
 */
export function catmullRomPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Returns the SVG polygon `points` string for a regular pentagon. */
export function pentagonPts(cx: number, cy: number, r: number, startDeg: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (startDeg + i * 72) * (Math.PI / 180);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

/**
 * During a dribble event, offsets the ball's rendered position to the
 * closest player's feet in their movement direction.
 * Returns an offset in SVG units { sx, sy }.
 */
export function dribbleOffset(
  ball: BallTrack,
  players: PlayerData[],
  currentTime: number,
): { sx: number; sy: number } {
  const ballPos = interpolatePosition(ball.keyframes, currentTime);

  let closest: PlayerData | null = null;
  let closestDist = Infinity;
  for (const p of players) {
    const pos = interpolatePosition(p.keyframes, currentTime);
    const d   = Math.hypot(pos.x - ballPos.x, pos.y - ballPos.y);
    if (d < closestDist) { closestDist = d; closest = p; }
  }
  if (!closest || closestDist > 0.12) return { sx: 0, sy: 0 };

  const pos  = interpolatePosition(closest.keyframes, currentTime);
  const prev = interpolatePosition(closest.keyframes, Math.max(0, currentTime - 100));
  const dx   = pos.x - prev.x;
  const dy   = pos.y - prev.y;
  const len  = Math.hypot(dx, dy);

  const fwdSx = len > 0.0005 ? (dx / len) * 9 : 0;
  const fwdSy = len > 0.0005 ? (dy / len) * 9 : 0;
  return { sx: fwdSx, sy: fwdSy + 12 };
}
