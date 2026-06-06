'use client';

import { PlayerData, BallTrack } from '@/lib/types';
import { PitchConfig, toSVG, HOME_COLOR, AWAY_COLOR, GK_COLOR, HOME_SHORTS, AWAY_SHORTS, GK_SHORTS } from '@/lib/pitch';
import { getAnimState } from '@/lib/animation';
import { interpolatePosition } from '@/lib/strategyUtils';

export interface PlayerSpriteProps {
  player: PlayerData;
  currentTime: number;
  ball: BallTrack;
  ballEvent: string | null;
  duration: number;
  cfg: PitchConfig;
  isEditing: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}

export function PlayerSprite({
  player, currentTime, ball, ballEvent, duration,
  cfg, isEditing, isDragging, onPointerDown,
}: PlayerSpriteProps) {
  const color  = player.team === 'home' ? HOME_COLOR : AWAY_COLOR;
  const isGK   = player.role === 'GK';
  const jersey = isGK ? GK_COLOR : color;
  const shorts = isGK ? GK_SHORTS : (player.team === 'home' ? HOME_SHORTS : AWAY_SHORTS);
  const glowId = `glow-${player.team}`;

  const pos        = interpolatePosition(player.keyframes, currentTime);
  const { sx, sy } = toSVG(pos.x, pos.y, cfg.pw, cfg.ph);
  const anim       = getAnimState(player, currentTime, ball, ballEvent, duration);
  const walkDur    = anim === 'run' || anim === 'tackle' ? '0.25s' : '0.5s';
  const isMoving   = anim === 'walk' || anim === 'run' || anim === 'dribble' || anim === 'tackle';

  const bodyGroup: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '50% 50%',
    animation:
      anim === 'celebrate' ? 'cel-jump 0.38s infinite ease-in-out' :
      anim === 'tackle'    ? 'tackle-lean 0.4s 3 ease-in-out'      :
      anim === 'dribble'   ? 'drib-sway 0.35s infinite ease-in-out':
      isMoving             ? `body-bob ${walkDur} infinite ease-in-out` : 'none',
  };
  const armL: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '100% 0%',
    animation:
      anim === 'save'      ? 'save-armL 0.5s ease-out forwards'        :
      anim === 'celebrate' ? 'cel-armL 0.38s infinite ease-in-out'     : 'none',
  };
  const armR: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '0% 0%',
    animation:
      anim === 'save'      ? 'save-armR 0.5s ease-out forwards'        :
      anim === 'celebrate' ? 'cel-armR 0.38s infinite ease-in-out'     : 'none',
  };
  const legL: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '50% 0%',
    animation: isMoving ? `legL-walk ${walkDur} infinite ease-in-out` : 'none',
  };
  const legR: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '50% 0%',
    animation:
      anim === 'kick' || anim === 'dribble' ? 'kick-leg 0.35s ease-out forwards'         :
      isMoving                              ? `legR-walk ${walkDur} infinite ease-in-out` : 'none',
  };

  return (
    <g
      transform={`translate(${sx},${sy})`}
      style={{ cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      onPointerDown={onPointerDown}
    >
      {/* ground shadow */}
      <ellipse cx={0} cy={13} rx={9} ry={3} fill="rgba(0,0,0,0.3)" />

      {isEditing && (
        <rect x={-14} y={-17} width={28} height={30} rx={3}
              fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
      )}

      <g style={bodyGroup}>
        {/* arms */}
        <rect x={-11} y={-5} width={4} height={7} fill={jersey} opacity={isDragging ? 0.75 : 1} style={armL} />
        <rect x={7}   y={-5} width={4} height={7} fill={jersey} opacity={isDragging ? 0.75 : 1} style={armR} />
        {/* jersey */}
        <rect x={-7} y={-5} width={14} height={12} fill={jersey} rx={1}
              filter={isDragging ? `url(#${glowId})` : undefined} opacity={isDragging ? 0.75 : 1} />
        {/* legs */}
        <rect x={-6} y={7} width={5} height={6} fill={shorts} style={legL} />
        <rect x={1}  y={7} width={5} height={6} fill={shorts} style={legR} />
        {/* head */}
        <rect x={-5} y={-15} width={10} height={9} rx={2} fill="#d4935a" />
        <rect x={-5} y={-15} width={10} height={3} rx={2} fill="#5c3317" />
        {/* jersey number */}
        <text textAnchor="middle" dominantBaseline="central" x={0} y={2}
              fontSize="5.5" fontWeight="900" fill="white"
              style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}>
          {player.number}
        </text>
      </g>

      {/* role label sits outside body group so it doesn't jump */}
      <text y={22} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="rgba(255,255,255,0.7)"
            style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}>
        {player.role}
      </text>
    </g>
  );
}
