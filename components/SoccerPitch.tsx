'use client';

import { useRef, useCallback } from 'react';
import { GameMode, Strategy, PlayerData, BallTrack } from '@/lib/types';
import { interpolatePosition } from '@/lib/strategyUtils';

// ── Per-mode field configs (SVG units ≈ 10px/m) ──────────────────────────────
type PitchConfig = {
  pw: number;       // pitch width
  ph: number;       // pitch height
  goalH: number;    // goal opening height
  goalD: number;    // goal depth
  goalBoxW: number; // goal-area box depth (0 = none)
  goalBoxH: number; // goal-area box height
  pad: number;      // viewBox padding
  centerR: number;  // centre circle radius (0 = none)
  stripes: number;  // grass stripe count
};

const CONFIGS: Record<GameMode, PitchConfig> = {
  '5v5': { pw: 400, ph: 250, goalH: 36, goalD: 20, goalBoxW: 50, goalBoxH: 100, pad: 32, centerR: 35, stripes: 4 },
  '3v3': { pw: 300, ph: 200, goalH: 28, goalD: 16, goalBoxW: 38, goalBoxH: 78,  pad: 28, centerR: 28, stripes: 3 },
  '1v1': { pw: 210, ph: 160, goalH: 22, goalD: 14, goalBoxW: 0,  goalBoxH: 0,   pad: 24, centerR: 0,  stripes: 2 },
};

const HOME_COLOR = '#ef4444';
const AWAY_COLOR = '#3b82f6';
const PLAYER_R = 14;

interface SoccerPitchProps {
  strategy: Strategy | null;
  currentTime: number;
  isEditing: boolean;
  gameMode: GameMode;
  onPlayerMove: (playerId: string, x: number, y: number) => void;
}

function toSVG(x: number, y: number, pw: number, ph: number) {
  return { sx: x * pw, sy: y * ph };
}

function svgPoint(
  e: React.PointerEvent,
  svg: SVGSVGElement,
  pw: number,
  ph: number
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  return {
    x: Math.max(0.01, Math.min(0.99, p.x / pw)),
    y: Math.max(0.02, Math.min(0.98, p.y / ph)),
  };
}

function nearestBallEvent(ball: BallTrack, time: number): string | null {
  for (const kf of ball.keyframes) {
    if (kf.event && Math.abs(kf.time - time) < 350) return kf.event;
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SoccerPitch({
  strategy,
  currentTime,
  isEditing,
  gameMode,
  onPlayerMove,
}: SoccerPitchProps) {
  const cfg = CONFIGS[gameMode];
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingId = useRef<string | null>(null);

  const handlePlayerPointerDown = useCallback(
    (e: React.PointerEvent, playerId: string) => {
      if (!isEditing) return;
      e.stopPropagation();
      draggingId.current = playerId;
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [isEditing]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId.current || !isEditing || !svgRef.current) return;
      const pos = svgPoint(e, svgRef.current, cfg.pw, cfg.ph);
      if (!pos) return;
      onPlayerMove(draggingId.current, pos.x, pos.y);
    },
    [isEditing, onPlayerMove, cfg.pw, cfg.ph]
  );

  const handlePointerUp = useCallback(() => { draggingId.current = null; }, []);

  const viewBox = `${-cfg.pad} ${-cfg.pad} ${cfg.pw + cfg.pad * 2} ${cfg.ph + cfg.pad * 2}`;
  const ballEvent = strategy ? nearestBallEvent(strategy.ball, currentTime) : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <div className="absolute top-1 left-2 text-[10px] font-black text-[#ef4444] opacity-60 pointer-events-none z-10 uppercase tracking-wider">
        HOME →
      </div>
      <div className="absolute top-1 right-2 text-[10px] font-black text-[#3b82f6] opacity-60 pointer-events-none z-10 uppercase tracking-wider">
        ← AWAY
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <marker id="arr-home" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <polygon points="0 0, 5 2.5, 0 5" fill={HOME_COLOR} opacity="0.75" />
          </marker>
          <marker id="arr-away" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <polygon points="0 0, 5 2.5, 0 5" fill={AWAY_COLOR} opacity="0.75" />
          </marker>
          <marker id="arr-ball" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="rgba(255,255,255,0.9)" />
          </marker>

          <filter id="glow-home" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-away" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ball-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <filter id="event-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <PitchMarkings cfg={cfg} />

        {strategy && (
          <>
            <BallTrajectoryLine ball={strategy.ball} cfg={cfg} />
            {strategy.players.map(player => (
              <PlayerTrajectoryLine key={`traj-${player.id}`} player={player} cfg={cfg} />
            ))}
            <BallDot ball={strategy.ball} currentTime={currentTime} event={ballEvent} cfg={cfg} />
            {strategy.players.map(player => {
              const pos = interpolatePosition(player.keyframes, currentTime);
              const { sx, sy } = toSVG(pos.x, pos.y, cfg.pw, cfg.ph);
              const color = player.team === 'home' ? HOME_COLOR : AWAY_COLOR;
              const isDragging = draggingId.current === player.id;

              return (
                <g
                  key={player.id}
                  transform={`translate(${sx},${sy})`}
                  style={{ cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                  onPointerDown={e => handlePlayerPointerDown(e, player.id)}
                >
                  <ellipse cx={0} cy={3} rx={PLAYER_R} ry={4} fill="rgba(0,0,0,0.35)" />
                  {isEditing && (
                    <circle r={PLAYER_R + 5} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
                  )}
                  <circle r={PLAYER_R} fill={color} filter={isDragging ? `url(#glow-${player.team})` : undefined} opacity={isDragging ? 0.75 : 1} />
                  <circle cx={-4} cy={-4} r={5} fill="rgba(255,255,255,0.18)" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="800" fill="white" style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}>
                    {player.number}
                  </text>
                  <text y={PLAYER_R + 8} textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.75)" style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}>
                    {player.role}
                  </text>
                </g>
              );
            })}
          </>
        )}

        {!strategy && (
          <g>
            <text x={cfg.pw / 2} y={cfg.ph / 2 - 16} textAnchor="middle" fontSize="20" fontWeight="700" fill="rgba(255,255,255,0.25)" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Describe a play to get started
            </text>
            <text x={cfg.pw / 2} y={cfg.ph / 2 + 14} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.12)" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Type in the AI Coach panel →
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PitchMarkings({ cfg }: { cfg: PitchConfig }) {
  const { pw, ph, goalH, goalD, goalBoxW, goalBoxH, pad, centerR, stripes } = cfg;
  const line  = { stroke: 'rgba(255,255,255,0.82)', strokeWidth: 2, fill: 'none' } as const;
  const thick = { stroke: 'rgba(255,255,255,0.9)',  strokeWidth: 3, fill: 'none' } as const;
  const goalY    = ph / 2 - goalH / 2;
  const goalBoxY = ph / 2 - goalBoxH / 2;
  const stripeW  = pw / stripes;

  return (
    <g>
      {/* Dark surround */}
      <rect x={-pad} y={-pad} width={pw + pad * 2} height={ph + pad * 2} fill="#172a1e" />

      {/* Grass stripes */}
      {Array.from({ length: stripes }, (_, i) => (
        <rect key={i} x={i * stripeW} y={0} width={stripeW} height={ph} fill={i % 2 === 0 ? '#2c5f2e' : '#316633'} />
      ))}

      {/* Boundary */}
      <rect x={0} y={0} width={pw} height={ph} {...thick} />

      {/* Halfway line */}
      <line x1={pw / 2} y1={0} x2={pw / 2} y2={ph} {...line} />

      {/* Centre */}
      {centerR > 0 && <circle cx={pw / 2} cy={ph / 2} r={centerR} {...line} />}
      <circle cx={pw / 2} cy={ph / 2} r={4} fill="rgba(255,255,255,0.88)" />

      {/* Left goal + goal area */}
      <rect x={-goalD} y={goalY} width={goalD} height={goalH} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
      {goalBoxW > 0 && <rect x={0} y={goalBoxY} width={goalBoxW} height={goalBoxH} {...line} />}
      <rect x={-goalD - 4} y={goalY - 6} width={5} height={goalH + 12} rx={2} fill={HOME_COLOR} opacity={0.7} />

      {/* Right goal + goal area */}
      <rect x={pw} y={goalY} width={goalD} height={goalH} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
      {goalBoxW > 0 && <rect x={pw - goalBoxW} y={goalBoxY} width={goalBoxW} height={goalBoxH} {...line} />}
      <rect x={pw + goalD - 1} y={goalY - 6} width={5} height={goalH + 12} rx={2} fill={AWAY_COLOR} opacity={0.7} />

      {/* Corner arcs */}
      <path d={`M 8 0 A 8 8 0 0 0 0 8`} {...line} />
      <path d={`M ${pw - 8} 0 A 8 8 0 0 1 ${pw} 8`} {...line} />
      <path d={`M 0 ${ph - 8} A 8 8 0 0 1 8 ${ph}`} {...line} />
      <path d={`M ${pw} ${ph - 8} A 8 8 0 0 0 ${pw - 8} ${ph}`} {...line} />
    </g>
  );
}

function PlayerTrajectoryLine({ player, cfg }: { player: PlayerData; cfg: PitchConfig }) {
  if (player.keyframes.length < 2) return null;
  const color = player.team === 'home' ? HOME_COLOR : AWAY_COLOR;
  const points = player.keyframes
    .map(kf => { const { sx, sy } = toSVG(kf.x, kf.y, cfg.pw, cfg.ph); return `${sx},${sy}`; })
    .join(' ');
  return <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="7 5" opacity={0.4} markerEnd={`url(#arr-${player.team})`} />;
}

function BallTrajectoryLine({ ball, cfg }: { ball: BallTrack; cfg: PitchConfig }) {
  if (ball.keyframes.length < 2) return null;
  const points = ball.keyframes
    .map(kf => { const { sx, sy } = toSVG(kf.x, kf.y, cfg.pw, cfg.ph); return `${sx},${sy}`; })
    .join(' ');
  return <polyline points={points} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="9 6" markerEnd="url(#arr-ball)" />;
}

function BallDot({ ball, currentTime, event, cfg }: { ball: BallTrack; currentTime: number; event: string | null; cfg: PitchConfig }) {
  const pos = interpolatePosition(ball.keyframes, currentTime);
  const { sx, sy } = toSVG(pos.x, pos.y, cfg.pw, cfg.ph);

  return (
    <g transform={`translate(${sx},${sy})`}>
      {event && <circle r={18} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} filter="url(#event-glow)" />}
      <g filter="url(#ball-shadow)">
        <circle r={9} fill="white" />
        <circle r={9} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
        <line x1={-7} y1={0} x2={7} y2={0} stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
        <line x1={0} y1={-7} x2={0} y2={7} stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
        <circle cx={-2} cy={-2} r={3} fill="rgba(255,255,255,0.25)" />
      </g>
      {event && (
        <text y={-18} textAnchor="middle" fontSize="9" fontWeight="800" fill="white" opacity="0.9" style={{ fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', userSelect: 'none' }}>
          {event.toUpperCase()}
        </text>
      )}
    </g>
  );
}
