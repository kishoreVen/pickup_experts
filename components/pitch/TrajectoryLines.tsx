'use client';

import { PlayerData, BallTrack } from '@/lib/types';
import { PitchConfig, toSVG, HOME_COLOR, AWAY_COLOR } from '@/lib/pitch';
import { catmullRomPath } from '@/lib/physics';

export function PlayerTrajectoryLine({ player, cfg }: { player: PlayerData; cfg: PitchConfig }) {
  if (player.keyframes.length < 2) return null;
  const color  = player.team === 'home' ? HOME_COLOR : AWAY_COLOR;
  const points = player.keyframes
    .map(kf => { const { sx, sy } = toSVG(kf.x, kf.y, cfg.pw, cfg.ph); return `${sx},${sy}`; })
    .join(' ');
  return (
    <polyline points={points} fill="none" stroke={color}
              strokeWidth={1.5} strokeDasharray="7 5" opacity={0.4}
              markerEnd={`url(#arr-${player.team})`} />
  );
}

export function BallTrajectoryLine({ ball, cfg }: { ball: BallTrack; cfg: PitchConfig }) {
  if (ball.keyframes.length < 2) return null;
  const pts = ball.keyframes.map(kf => {
    const { sx, sy } = toSVG(kf.x, kf.y, cfg.pw, cfg.ph);
    return { x: sx, y: sy };
  });
  return (
    <path d={catmullRomPath(pts)} fill="none"
          stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeDasharray="9 6"
          markerEnd="url(#arr-ball)" />
  );
}
