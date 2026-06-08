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

/** Returns true while the ball is travelling between a pass/shot/cross/clearance and its landing. */
export function isInFlight(ball: BallTrack, time: number): boolean {
  const FLIGHT = new Set<string>(['pass', 'shot', 'cross', 'clearance']);
  for (let i = 0; i < ball.keyframes.length - 1; i++) {
    const kf = ball.keyframes[i];
    if (kf.event && FLIGHT.has(kf.event) && time > kf.time && time < ball.keyframes[i + 1].time) {
      return true;
    }
  }
  return false;
}

/**
 * When the ball is not in flight, snaps it to the closest player's position
 * (within a generous threshold) so that AI coordinate misalignments don't
 * produce ghost-kick artefacts.
 *
 * Returns null when the ball is in flight or no player is close enough.
 */
export function carrierSnapPos(
  ball: BallTrack,
  players: PlayerData[],
  currentTime: number,
): { x: number; y: number } | null {
  if (isInFlight(ball, currentTime)) return null;

  // Use the segment-start keyframe to determine ball ownership — this prevents
  // oscillation when two players are equidistant from the interpolated ball position.
  let segStart = ball.keyframes[0];
  for (const kf of ball.keyframes) {
    if (kf.time <= currentTime) segStart = kf;
    else break;
  }

  // Ball is past the goal line — do not snap
  if (segStart.x < 0.05 || segStart.x > 0.95) return null;

  // Find the player closest to the ball at segment-start time (stable ownership)
  let carrier: PlayerData | null = null;
  let closestDist = Infinity;

  for (const p of players) {
    const pos = interpolatePosition(p.keyframes, segStart.time);
    const d   = Math.hypot(pos.x - segStart.x, pos.y - segStart.y);
    if (d < closestDist) { closestDist = d; carrier = p; }
  }

  if (!carrier || closestDist > 0.15) return null;
  return interpolatePosition(carrier.keyframes, currentTime);
}

/**
 * Overrides the GK's y position to track the ball during a shot.
 * Returns null when the player is not a GK or no shot has happened yet.
 */
export function gkTrackPos(
  player: PlayerData,
  ball: BallTrack,
  currentTime: number,
): { x: number; y: number } | null {
  if (player.role !== 'GK') return null;

  let shotTime = -1;
  for (let i = 0; i < ball.keyframes.length - 1; i++) {
    if (ball.keyframes[i].event === 'shot') { shotTime = ball.keyframes[i].time; break; }
  }
  if (shotTime < 0 || currentTime < shotTime) return null;

  const finalKf = ball.keyframes[ball.keyframes.length - 1];
  const gkPos   = interpolatePosition(player.keyframes, currentTime);

  // Clamp the target y within the goal area so the GK never dives off-pitch
  const targetY = Math.max(0.28, Math.min(0.72, finalKf.y));

  const total  = Math.max(1, finalKf.time - shotTime);
  const t      = Math.min(1, (currentTime - shotTime) / total);
  const eased  = t * t * (3 - 2 * t); // smoothstep

  return { x: gkPos.x, y: gkPos.y + (targetY - gkPos.y) * eased };
}

/**
 * During a dribble event, returns a foot-offset in SVG units so the ball
 * renders slightly ahead of and below the carrier. Used on top of carrierSnapPos.
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
