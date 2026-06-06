'use client';

import { BallTrack } from '@/lib/types';
import { PitchConfig, toSVG } from '@/lib/pitch';
import { pentagonPts } from '@/lib/physics';
import { interpolatePosition } from '@/lib/strategyUtils';

const BALL_R       = 11;
const OUTER_ANGLES = [-90, -18, 54, 126, 198]; // align with center pentagon vertices

export interface BallDotProps {
  ball: BallTrack;
  currentTime: number;
  event: string | null;
  cfg: PitchConfig;
  offset?: { sx: number; sy: number };
}

export function BallDot({ ball, currentTime, event, cfg, offset }: BallDotProps) {
  const pos        = interpolatePosition(ball.keyframes, currentTime);
  const { sx, sy } = toSVG(pos.x, pos.y, cfg.pw, cfg.ph);
  const ox         = offset?.sx ?? 0;
  const oy         = offset?.sy ?? 0;

  return (
    <g transform={`translate(${sx + ox},${sy + oy})`}>
      {event && (
        <circle r={22} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} filter="url(#event-glow)" />
      )}

      <g filter="url(#ball-shadow)">
        {/* white base */}
        <circle r={BALL_R} fill="white" />
        {/* center pentagon */}
        <polygon points={pentagonPts(0, 0, 4, -90)} fill="rgba(15,15,15,0.85)" />
        {/* 5 outer pentagons */}
        {OUTER_ANGLES.map(deg => {
          const rad = deg * (Math.PI / 180);
          return (
            <polygon
              key={deg}
              points={pentagonPts(7.2 * Math.cos(rad), 7.2 * Math.sin(rad), 2.8, deg + 180)}
              fill="rgba(15,15,15,0.85)"
            />
          );
        })}
        <circle r={BALL_R} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={0.8} />
        {/* specular highlight */}
        <circle cx={-3} cy={-3.5} r={3} fill="rgba(255,255,255,0.28)" />
      </g>

      {event && (
        <text y={-24} textAnchor="middle" fontSize="9" fontWeight="800" fill="white" opacity="0.9"
              style={{ fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', userSelect: 'none' }}>
          {event.toUpperCase()}
        </text>
      )}
    </g>
  );
}
