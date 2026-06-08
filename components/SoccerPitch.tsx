'use client';

import { useRef, useCallback } from 'react';
import { GameMode, Strategy, PlayOutcome } from '@/lib/types';
import { CONFIGS, HOME_COLOR, AWAY_COLOR, svgPoint } from '@/lib/pitch';
import { nearestBallEvent, SPRITE_KEYFRAMES } from '@/lib/animation';
import { dribbleOffset, carrierSnapPos } from '@/lib/physics';
import { PlayerSprite } from './sprites/PlayerSprite';
import { BallDot } from './sprites/BallDot';
import { PitchMarkings } from './pitch/PitchMarkings';

interface SoccerPitchProps {
  strategy: Strategy | null;
  currentTime: number;

  isEditing: boolean;
  gameMode: GameMode;
  homeAttacksRight?: boolean;
  onPlayerMove: (playerId: string, x: number, y: number) => void;
}

function getFlashInfo(outcome?: PlayOutcome): { label: string; color: string } | null {
  switch (outcome) {
    case 'goal_clean':       return { label: 'GOAL!',         color: '#22c55e' };
    case 'goal_rebound':     return { label: 'GOAL!',         color: '#22c55e' };
    case 'own_goal':         return { label: 'OWN GOAL!',     color: '#f97316' };
    case 'no_goal_saved':    return { label: 'SAVED!',        color: '#3b82f6' };
    case 'no_goal_blocked':  return { label: 'BLOCKED!',      color: '#3b82f6' };
    case 'no_goal_post':     return { label: 'OFF THE POST!', color: '#f97316' };
    case 'no_goal_close':    return { label: 'MISSED!',       color: '#ef4444' };
    case 'no_goal_terrible': return { label: 'MISSED!',       color: '#ef4444' };
    default:                 return null;
  }
}

export default function SoccerPitch({
  strategy, currentTime, isEditing, gameMode, homeAttacksRight = true, onPlayerMove,
}: SoccerPitchProps) {
  const cfg        = CONFIGS[gameMode];
  const svgRef     = useRef<SVGSVGElement>(null);
  const draggingId = useRef<string | null>(null);

  const handlePlayerPointerDown = useCallback(
    (e: React.PointerEvent, playerId: string) => {
      if (!isEditing) return;
      e.stopPropagation();
      draggingId.current = playerId;
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [isEditing],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId.current || !isEditing || !svgRef.current) return;
      const pos = svgPoint(e, svgRef.current, cfg.pw, cfg.ph);
      if (!pos) return;
      onPlayerMove(draggingId.current, pos.x, pos.y);
    },
    [isEditing, onPlayerMove, cfg.pw, cfg.ph],
  );

  const handlePointerUp = useCallback(() => { draggingId.current = null; }, []);

  const viewBox    = `${-cfg.pad} ${-cfg.pad} ${cfg.pw + cfg.pad * 2} ${cfg.ph + cfg.pad * 2}`;
  const ballEvent    = strategy ? nearestBallEvent(strategy.ball, currentTime) : null;
  const ballSnapPos  = strategy
    ? (carrierSnapPos(strategy.ball, strategy.players, currentTime) ?? undefined)
    : undefined;
  // Only apply foot-offset when not already snapped — avoids double-correction jitter
  const ballOffset   = !ballSnapPos && strategy && ballEvent === 'dribble'
    ? dribbleOffset(strategy.ball, strategy.players, currentTime)
    : undefined;

  const flashInfo = getFlashInfo(strategy?.outcome);
  const showFlash = !!strategy && !!flashInfo &&
    currentTime > strategy.duration - 1800 && currentTime < strategy.duration - 700;

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <div className="absolute top-1 left-2 text-[10px] font-black opacity-60 pointer-events-none z-10 uppercase tracking-wider"
           style={{ color: homeAttacksRight ? '#ef4444' : '#3b82f6' }}>
        {homeAttacksRight ? 'HOME →' : 'AWAY →'}
      </div>
      <div className="absolute top-1 right-2 text-[10px] font-black opacity-60 pointer-events-none z-10 uppercase tracking-wider"
           style={{ color: homeAttacksRight ? '#3b82f6' : '#ef4444' }}>
        {homeAttacksRight ? '← AWAY' : '← HOME'}
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
          <style>{SPRITE_KEYFRAMES}</style>

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

        <PitchMarkings cfg={cfg} homeAttacksRight={homeAttacksRight} />

        {strategy && (
          <>
            <BallDot
              ball={strategy.ball}
              currentTime={currentTime}
              event={ballEvent}
              cfg={cfg}
              offset={ballOffset}
              posOverride={ballSnapPos}
            />
            {strategy.players.map(player => (
              <PlayerSprite
                key={player.id}
                player={player}
                currentTime={currentTime}
                ball={strategy.ball}
                ballEvent={ballEvent}
                duration={strategy.duration}
                outcome={strategy.outcome}
                scoringTeam={strategy.scoringTeam}
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
            <text x={cfg.pw / 2} y={cfg.ph / 2 - 16} textAnchor="middle" fontSize="20" fontWeight="700"
                  fill="rgba(255,255,255,0.25)" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Describe a play to get started
            </text>
            <text x={cfg.pw / 2} y={cfg.ph / 2 + 14} textAnchor="middle" fontSize="13"
                  fill="rgba(255,255,255,0.12)" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Type in the AI Coach panel →
            </text>
          </g>
        )}
      </svg>

      {showFlash && flashInfo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span
            className="font-black uppercase tracking-widest animate-pulse select-none"
            style={{
              fontSize: 'clamp(2rem, 8vw, 5.5rem)',
              color: flashInfo.color,
              textShadow: `0 0 50px ${flashInfo.color}, 0 0 100px ${flashInfo.color}66`,
            }}
          >
            {flashInfo.label}
          </span>
        </div>
      )}
    </div>
  );
}
