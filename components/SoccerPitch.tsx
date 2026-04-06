'use client';

import { useRef, useCallback } from 'react';
import { Strategy, PlayerData, BallTrack } from '@/lib/types';
import { interpolatePosition } from '@/lib/strategyUtils';

// ── Pitch constants (SVG units, 10px ≈ 1m) ──────────────────────────────────
const PW = 1050; // pitch width (goal line to goal line, 105m)
const PH = 680;  // pitch height (touchline to touchline, 68m)
const GOAL_D = 30; // goal depth (extends outside pitch boundary)
const PAD = GOAL_D + 12; // viewBox padding so goals are fully visible

const HOME_COLOR = '#ef4444';
const AWAY_COLOR = '#3b82f6';
const PLAYER_R = 14; // player dot radius

interface SoccerPitchProps {
  strategy: Strategy | null;
  currentTime: number;
  isEditing: boolean;
  onPlayerMove: (playerId: string, x: number, y: number) => void;
}

/** Convert normalized field coords (0–1) to SVG pixels */
function toSVG(x: number, y: number) {
  return { sx: x * PW, sy: y * PH };
}

/** Convert SVG pointer event to normalised field position */
function svgPoint(
  e: React.PointerEvent,
  svg: SVGSVGElement
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  return {
    x: Math.max(0.01, Math.min(0.99, p.x / PW)),
    y: Math.max(0.02, Math.min(0.98, p.y / PH)),
  };
}

/** Find ball event that is within 350ms of the given time */
function nearestBallEvent(ball: BallTrack, time: number): string | null {
  for (const kf of ball.keyframes) {
    if (kf.event && Math.abs(kf.time - time) < 350) return kf.event;
  }
  return null;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SoccerPitch({
  strategy,
  currentTime,
  isEditing,
  onPlayerMove,
}: SoccerPitchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingId = useRef<string | null>(null);

  const handlePlayerPointerDown = useCallback(
    (e: React.PointerEvent, playerId: string) => {
      if (!isEditing) return;
      e.stopPropagation();
      draggingId.current = playerId;
      // Capture on the SVG so moves still register when fast
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [isEditing]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId.current || !isEditing || !svgRef.current) return;
      const pos = svgPoint(e, svgRef.current);
      if (!pos) return;
      onPlayerMove(draggingId.current, pos.x, pos.y);
    },
    [isEditing, onPlayerMove]
  );

  const handlePointerUp = useCallback(() => {
    draggingId.current = null;
  }, []);

  const viewBox = `${-PAD} ${-PAD} ${PW + PAD * 2} ${PH + PAD * 2}`;
  const ballEvent = strategy ? nearestBallEvent(strategy.ball, currentTime) : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* Team direction labels */}
      <div className="absolute top-1 left-2 flex items-center gap-1 text-[10px] font-black text-[#ef4444] opacity-60 pointer-events-none z-10 uppercase tracking-wider">
        HOME →
      </div>
      <div className="absolute top-1 right-2 flex items-center gap-1 text-[10px] font-black text-[#3b82f6] opacity-60 pointer-events-none z-10 uppercase tracking-wider">
        ← AWAY
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full"
        style={{ touchAction: 'none', cursor: isEditing ? 'default' : 'default' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          {/* Arrowhead markers */}
          <marker id="arr-home" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <polygon points="0 0, 5 2.5, 0 5" fill={HOME_COLOR} opacity="0.75" />
          </marker>
          <marker id="arr-away" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <polygon points="0 0, 5 2.5, 0 5" fill={AWAY_COLOR} opacity="0.75" />
          </marker>
          <marker id="arr-ball" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="rgba(255,255,255,0.9)" />
          </marker>

          {/* Glow filters */}
          <filter id="glow-home" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-away" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ball-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <filter id="event-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Pitch surface ── */}
        <PitchMarkings />

        {/* ── Strategy layers ── */}
        {strategy && (
          <>
            {/* Ball trajectory */}
            <BallTrajectoryLine ball={strategy.ball} />

            {/* Player trajectories */}
            {strategy.players.map(player => (
              <PlayerTrajectoryLine key={`traj-${player.id}`} player={player} />
            ))}

            {/* Ball */}
            <BallDot ball={strategy.ball} currentTime={currentTime} event={ballEvent} />

            {/* Players */}
            {strategy.players.map(player => {
              const pos = interpolatePosition(player.keyframes, currentTime);
              const { sx, sy } = toSVG(pos.x, pos.y);
              const color = player.team === 'home' ? HOME_COLOR : AWAY_COLOR;
              const isDragging = draggingId.current === player.id;

              return (
                <g
                  key={player.id}
                  transform={`translate(${sx},${sy})`}
                  style={{ cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                  onPointerDown={e => handlePlayerPointerDown(e, player.id)}
                >
                  {/* Ground shadow */}
                  <ellipse cx={0} cy={3} rx={PLAYER_R} ry={4} fill="rgba(0,0,0,0.35)" />

                  {/* Edit-mode ring */}
                  {isEditing && (
                    <circle
                      r={PLAYER_R + 5}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      opacity={0.5}
                    />
                  )}

                  {/* Main dot */}
                  <circle
                    r={PLAYER_R}
                    fill={color}
                    filter={isDragging ? `url(#glow-${player.team})` : undefined}
                    opacity={isDragging ? 0.75 : 1}
                  />

                  {/* Specular highlight */}
                  <circle cx={-4} cy={-4} r={5} fill="rgba(255,255,255,0.18)" />

                  {/* Jersey number */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="11"
                    fontWeight="800"
                    fill="white"
                    style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {player.number}
                  </text>

                  {/* Position label below dot */}
                  <text
                    y={PLAYER_R + 8}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="700"
                    fill="rgba(255,255,255,0.75)"
                    style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {player.role}
                  </text>
                </g>
              );
            })}
          </>
        )}

        {/* ── Empty state ── */}
        {!strategy && (
          <g>
            <text
              x={PW / 2}
              y={PH / 2 - 16}
              textAnchor="middle"
              fontSize="20"
              fontWeight="700"
              fill="rgba(255,255,255,0.25)"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              Describe a play to get started
            </text>
            <text
              x={PW / 2}
              y={PH / 2 + 14}
              textAnchor="middle"
              fontSize="13"
              fill="rgba(255,255,255,0.12)"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              Type in the AI Coach panel →
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PitchMarkings() {
  const line = { stroke: 'rgba(255,255,255,0.82)', strokeWidth: 2, fill: 'none' } as const;
  const thick = { stroke: 'rgba(255,255,255,0.9)', strokeWidth: 3, fill: 'none' } as const;

  return (
    <g>
      {/* Dark surround (outside pitch) */}
      <rect x={-PAD} y={-PAD} width={PW + PAD * 2} height={PH + PAD * 2} fill="#172a1e" />

      {/* Alternating grass stripes (10 vertical bands, ~105px each) */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x={i * 105}
          y={0}
          width={105}
          height={PH}
          fill={i % 2 === 0 ? '#2c5f2e' : '#316633'}
        />
      ))}

      {/* ── Pitch boundary ── */}
      <rect x={0} y={0} width={PW} height={PH} {...thick} />

      {/* ── Halfway line ── */}
      <line x1={PW / 2} y1={0} x2={PW / 2} y2={PH} {...line} />

      {/* ── Centre circle & spot ── */}
      <circle cx={PW / 2} cy={PH / 2} r={91.5} {...line} />
      <circle cx={PW / 2} cy={PH / 2} r={4} fill="rgba(255,255,255,0.88)" />

      {/* ══ LEFT END ══ */}
      {/* Goal (outside boundary) */}
      <rect x={-GOAL_D} y={303} width={GOAL_D} height={74} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
      {/* Penalty area */}
      <rect x={0} y={138} width={165} height={404} {...line} />
      {/* Goal area (6-yd box) */}
      <rect x={0} y={249} width={55} height={182} {...line} />
      {/* Penalty spot */}
      <circle cx={110} cy={PH / 2} r={4} fill="rgba(255,255,255,0.88)" />
      {/* Penalty arc (portion outside penalty area) */}
      <path d="M 165 267 A 91.5 91.5 0 0 1 165 413" {...line} />

      {/* ══ RIGHT END ══ */}
      {/* Goal */}
      <rect x={PW} y={303} width={GOAL_D} height={74} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
      {/* Penalty area */}
      <rect x={PW - 165} y={138} width={165} height={404} {...line} />
      {/* Goal area */}
      <rect x={PW - 55} y={249} width={55} height={182} {...line} />
      {/* Penalty spot */}
      <circle cx={PW - 110} cy={PH / 2} r={4} fill="rgba(255,255,255,0.88)" />
      {/* Penalty arc */}
      <path d="M 885 267 A 91.5 91.5 0 0 0 885 413" {...line} />

      {/* ── Corner arcs ── */}
      <path d="M 10 0 A 10 10 0 0 0 0 10" {...line} />
      <path d="M 1040 0 A 10 10 0 0 1 1050 10" {...line} />
      <path d="M 0 670 A 10 10 0 0 1 10 680" {...line} />
      <path d="M 1050 670 A 10 10 0 0 0 1040 680" {...line} />

      {/* ── Team colour bars on goal frames ── */}
      <rect x={-GOAL_D - 4} y={295} width={5} height={90} rx={2} fill={HOME_COLOR} opacity={0.7} />
      <rect x={PW + GOAL_D - 1} y={295} width={5} height={90} rx={2} fill={AWAY_COLOR} opacity={0.7} />
    </g>
  );
}

function PlayerTrajectoryLine({ player }: { player: PlayerData }) {
  if (player.keyframes.length < 2) return null;
  const color = player.team === 'home' ? HOME_COLOR : AWAY_COLOR;
  const markerId = `arr-${player.team}`;
  const points = player.keyframes
    .map(kf => {
      const { sx, sy } = toSVG(kf.x, kf.y);
      return `${sx},${sy}`;
    })
    .join(' ');

  return (
    <polyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray="7 5"
      opacity={0.4}
      markerEnd={`url(#${markerId})`}
    />
  );
}

function BallTrajectoryLine({ ball }: { ball: BallTrack }) {
  if (ball.keyframes.length < 2) return null;
  const points = ball.keyframes
    .map(kf => {
      const { sx, sy } = toSVG(kf.x, kf.y);
      return `${sx},${sy}`;
    })
    .join(' ');

  return (
    <polyline
      points={points}
      fill="none"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth={2}
      strokeDasharray="9 6"
      markerEnd="url(#arr-ball)"
    />
  );
}

function BallDot({
  ball,
  currentTime,
  event,
}: {
  ball: BallTrack;
  currentTime: number;
  event: string | null;
}) {
  const pos = interpolatePosition(ball.keyframes, currentTime);
  const { sx, sy } = toSVG(pos.x, pos.y);

  return (
    <g transform={`translate(${sx},${sy})`}>
      {/* Event flash ring */}
      {event && (
        <circle r={18} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} filter="url(#event-glow)" />
      )}

      {/* Ball */}
      <g filter="url(#ball-shadow)">
        <circle r={9} fill="white" />
        {/* Simplified ball texture */}
        <circle r={9} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
        <line x1={-7} y1={0} x2={7} y2={0} stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
        <line x1={0} y1={-7} x2={0} y2={7} stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
        <circle cx={-2} cy={-2} r={3} fill="rgba(255,255,255,0.25)" />
      </g>

      {/* Event label */}
      {event && (
        <text
          y={-18}
          textAnchor="middle"
          fontSize="9"
          fontWeight="800"
          fill="white"
          opacity="0.9"
          style={{ fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', userSelect: 'none' }}
        >
          {event.toUpperCase()}
        </text>
      )}
    </g>
  );
}
