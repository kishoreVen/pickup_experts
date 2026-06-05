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

const HOME_COLOR   = '#ef4444';
const AWAY_COLOR   = '#3b82f6';
const GK_COLOR     = '#84cc16'; // lime green for both GKs
const HOME_SHORTS  = '#7f1d1d'; // dark red
const AWAY_SHORTS  = '#1e3a8a'; // dark blue
const GK_SHORTS    = '#365314'; // dark green
const PLAYER_R     = 14;

// Smooth ball trajectory: Catmull-Rom → cubic bezier
function catmullRomPath(pts: { x: number; y: number }[]): string {
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

// ── Player animation state ────────────────────────────────────────────────────
type AnimState = 'idle' | 'walk' | 'run' | 'kick' | 'save' | 'dribble' | 'tackle' | 'celebrate';

function getAnimState(
  player: PlayerData,
  currentTime: number,
  ball: BallTrack,
  ballEvent: string | null,
  duration: number,
): AnimState {
  if (currentTime > duration - 1200 && duration > 2000) return 'celebrate';

  const pos     = interpolatePosition(player.keyframes, currentTime);
  const prevPos = interpolatePosition(player.keyframes, Math.max(0, currentTime - 80));
  const speed   = Math.sqrt((pos.x - prevPos.x) ** 2 + (pos.y - prevPos.y) ** 2);

  const ballPos    = interpolatePosition(ball.keyframes, currentTime);
  const distToBall = Math.sqrt((pos.x - ballPos.x) ** 2 + (pos.y - ballPos.y) ** 2);

  if (player.role === 'GK' && ballEvent === 'shot' && distToBall < 0.2) return 'save';
  if ((ballEvent === 'shot' || ballEvent === 'pass' || ballEvent === 'cross') && distToBall < 0.1) return 'kick';
  if (ballEvent === 'dribble' && distToBall < 0.08) return 'dribble';
  if (speed > 0.01 && distToBall > 0.07 && distToBall < 0.18 &&
      (player.role === 'CB' || player.role === 'CM')) return 'tackle';
  if (speed > 0.007) return 'run';
  if (speed > 0.0015) return 'walk';
  return 'idle';
}

// Soccer ball pentagon helper
function pentagonPts(cx: number, cy: number, r: number, startDeg: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (startDeg + i * 72) * (Math.PI / 180);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

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
          <style>{`
            @keyframes legL-walk  { 0%,100%{transform:translateY(0)}      50%{transform:translateY(3.5px)} }
            @keyframes legR-walk  { 0%,100%{transform:translateY(3.5px)}  50%{transform:translateY(0)} }
            @keyframes body-bob   { 0%,100%{transform:translateY(0)}      50%{transform:translateY(-1.5px)} }
            @keyframes kick-leg   { 0%{transform:translateY(0) rotate(0deg)} 35%{transform:translateY(-7px) rotate(-28deg)} 65%{transform:translateY(4px) rotate(18deg)} 100%{transform:translateY(0) rotate(0deg)} }
            @keyframes save-armL  { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-7px,-9px) rotate(-55deg)} }
            @keyframes save-armR  { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(7px,-9px)  rotate(55deg)} }
            @keyframes cel-jump   { 0%,100%{transform:translateY(0)}      50%{transform:translateY(-6px)} }
            @keyframes cel-armL   { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-3px,-11px) rotate(-72deg)} }
            @keyframes cel-armR   { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(3px,-11px)  rotate(72deg)} }
            @keyframes drib-sway  { 0%,100%{transform:rotate(-7deg)}      50%{transform:rotate(7deg)} }
            @keyframes tackle-lean{ 0%{transform:rotate(0deg)} 55%{transform:rotate(22deg)} 100%{transform:rotate(0deg)} }
          `}</style>
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
            {strategy.players.map(player => (
              <PlayerSprite
                key={player.id}
                player={player}
                currentTime={currentTime}
                ball={strategy.ball}
                ballEvent={ballEvent}
                duration={strategy.duration}
                cfg={cfg}
                isEditing={isEditing}
                isDragging={draggingId.current === player.id}
                onPointerDown={e => handlePlayerPointerDown(e, player.id)}
              />
            ))}
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

interface PlayerSpriteProps {
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

function PlayerSprite({ player, currentTime, ball, ballEvent, duration, cfg, isEditing, isDragging, onPointerDown }: PlayerSpriteProps) {
  const color  = player.team === 'home' ? HOME_COLOR : AWAY_COLOR;
  const isGK   = player.role === 'GK';
  const jersey = isGK ? GK_COLOR : color;
  const shorts = isGK ? GK_SHORTS : (player.team === 'home' ? HOME_SHORTS : AWAY_SHORTS);
  const glowId = `glow-${player.team}`;

  const pos      = interpolatePosition(player.keyframes, currentTime);
  const { sx, sy } = toSVG(pos.x, pos.y, cfg.pw, cfg.ph);
  const anim     = getAnimState(player, currentTime, ball, ballEvent, duration);
  const walkDur  = anim === 'run' || anim === 'tackle' ? '0.25s' : '0.5s';
  const isMoving = anim === 'walk' || anim === 'run' || anim === 'dribble' || anim === 'tackle';

  const bodyGroupStyle: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '50% 50%',
    animation: anim === 'celebrate' ? 'cel-jump 0.38s infinite ease-in-out'
      : anim === 'tackle'   ? 'tackle-lean 0.4s 3 ease-in-out'
      : anim === 'dribble'  ? 'drib-sway 0.35s infinite ease-in-out'
      : isMoving            ? `body-bob ${walkDur} infinite ease-in-out`
      : 'none',
  };
  const armLStyle: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '100% 0%',
    animation: anim === 'save'      ? 'save-armL 0.5s ease-out forwards'
      : anim === 'celebrate'        ? 'cel-armL 0.38s infinite ease-in-out'
      : 'none',
  };
  const armRStyle: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '0% 0%',
    animation: anim === 'save'      ? 'save-armR 0.5s ease-out forwards'
      : anim === 'celebrate'        ? 'cel-armR 0.38s infinite ease-in-out'
      : 'none',
  };
  const legLStyle: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '50% 0%',
    animation: isMoving ? `legL-walk ${walkDur} infinite ease-in-out` : 'none',
  };
  const legRStyle: React.CSSProperties = {
    transformBox: 'fill-box', transformOrigin: '50% 0%',
    animation: anim === 'kick' || anim === 'dribble' ? 'kick-leg 0.35s ease-out forwards'
      : isMoving ? `legR-walk ${walkDur} infinite ease-in-out`
      : 'none',
  };

  return (
    <g
      transform={`translate(${sx},${sy})`}
      style={{ cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      onPointerDown={onPointerDown}
    >
      <ellipse cx={0} cy={13} rx={9} ry={3} fill="rgba(0,0,0,0.3)" />
      {isEditing && (
        <rect x={-14} y={-17} width={28} height={30} rx={3} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
      )}
      <g style={bodyGroupStyle}>
        <rect x={-11} y={-5} width={4} height={7} fill={jersey} opacity={isDragging ? 0.75 : 1} style={armLStyle} />
        <rect x={7}   y={-5} width={4} height={7} fill={jersey} opacity={isDragging ? 0.75 : 1} style={armRStyle} />
        <rect x={-7}  y={-5} width={14} height={12} fill={jersey} rx={1}
              filter={isDragging ? `url(#${glowId})` : undefined} opacity={isDragging ? 0.75 : 1} />
        <rect x={-6} y={7} width={5} height={6} fill={shorts} style={legLStyle} />
        <rect x={1}  y={7} width={5} height={6} fill={shorts} style={legRStyle} />
        <rect x={-5} y={-15} width={10} height={9} rx={2} fill="#d4935a" />
        <rect x={-5} y={-15} width={10} height={3}  rx={2} fill="#5c3317" />
        <text textAnchor="middle" dominantBaseline="central" x={0} y={2}
              fontSize="5.5" fontWeight="900" fill="white"
              style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}>
          {player.number}
        </text>
      </g>
      <text y={22} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="rgba(255,255,255,0.7)"
            style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', pointerEvents: 'none' }}>
        {player.role}
      </text>
    </g>
  );
}

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
  const pts = ball.keyframes.map(kf => {
    const { sx, sy } = toSVG(kf.x, kf.y, cfg.pw, cfg.ph);
    return { x: sx, y: sy };
  });
  return <path d={catmullRomPath(pts)} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeDasharray="9 6" markerEnd="url(#arr-ball)" />;
}

const BALL_R = 11;
const OUTER_ANGLES = [-90, -18, 54, 126, 198]; // match center pentagon vertices

function BallDot({ ball, currentTime, event, cfg }: { ball: BallTrack; currentTime: number; event: string | null; cfg: PitchConfig }) {
  const pos = interpolatePosition(ball.keyframes, currentTime);
  const { sx, sy } = toSVG(pos.x, pos.y, cfg.pw, cfg.ph);

  return (
    <g transform={`translate(${sx},${sy})`}>
      {event && <circle r={22} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} filter="url(#event-glow)" />}
      <g filter="url(#ball-shadow)">
        {/* white base */}
        <circle r={BALL_R} fill="white" />
        {/* center pentagon */}
        <polygon points={pentagonPts(0, 0, 4, -90)} fill="rgba(15,15,15,0.85)" />
        {/* 5 outer pentagons radiating outward */}
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
        {/* subtle highlight */}
        <circle cx={-3} cy={-3.5} r={3} fill="rgba(255,255,255,0.28)" />
      </g>
      {event && (
        <text y={-24} textAnchor="middle" fontSize="9" fontWeight="800" fill="white" opacity="0.9" style={{ fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', userSelect: 'none' }}>
          {event.toUpperCase()}
        </text>
      )}
    </g>
  );
}
