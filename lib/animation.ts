import { BallTrack, PlayerData, PlayOutcome } from './types';
import { interpolatePosition } from './strategyUtils';

export type AnimState =
  | 'idle' | 'walk' | 'run'
  | 'kick' | 'save' | 'dribble'
  | 'tackle' | 'celebrate' | 'dejected';

/** Ball ends in goal when the final keyframe has crossed the goal line. */
export function ballEndsInGoal(ball: BallTrack): boolean {
  if (ball.keyframes.length === 0) return false;
  const { x } = ball.keyframes[ball.keyframes.length - 1];
  return x <= 0.07 || x >= 0.93;
}

/** Returns the event label of the ball keyframe closest to `time` (±350 ms). */
export function nearestBallEvent(ball: BallTrack, time: number): string | null {
  for (const kf of ball.keyframes) {
    if (kf.event && Math.abs(kf.time - time) < 350) return kf.event;
  }
  return null;
}

/**
 * Derives the current animation state for one player from:
 * - their movement speed (position delta over 80 ms)
 * - their distance to the ball
 * - the nearest ball event
 * - the play outcome and scoring team (for celebrate / dejected)
 * - their playRole (for richer per-player behaviour)
 */
export function getAnimState(
  player: PlayerData,
  currentTime: number,
  ball: BallTrack,
  ballEvent: string | null,
  duration: number,
  outcome?: PlayOutcome,
  scoringTeam?: 'home' | 'away',
): AnimState {
  if (currentTime > duration - 700 && duration > 2000) {
    if (scoringTeam) {
      // scoringTeam is set for both goal and no-goal outcomes
      return player.team === scoringTeam ? 'celebrate' : 'dejected';
    }
    // Fallback for old strategies with no scoringTeam: use ball position
    if (ballEndsInGoal(ball)) return 'celebrate';
  }

  const pos     = interpolatePosition(player.keyframes, currentTime);
  const prevPos = interpolatePosition(player.keyframes, Math.max(0, currentTime - 80));
  const speed   = Math.hypot(pos.x - prevPos.x, pos.y - prevPos.y);

  const ballPos    = interpolatePosition(ball.keyframes, currentTime);
  const distToBall = Math.hypot(pos.x - ballPos.x, pos.y - ballPos.y);

  const pr = player.playRole;

  // GK save
  if ((player.role === 'GK' || pr === 'gk_active') && ballEvent === 'shot' && distToBall < 0.25) {
    return 'save';
  }

  // Kick on shot/pass/cross contact
  if ((ballEvent === 'shot' || ballEvent === 'pass' || ballEvent === 'cross') && distToBall < 0.1) {
    return 'kick';
  }

  // Dribble
  if (ballEvent === 'dribble' && distToBall < 0.1) return 'dribble';
  if (pr === 'ball_carrier' && distToBall < 0.08) return 'dribble';

  // Press / tackle
  if (pr === 'press' && distToBall < 0.18) return 'tackle';
  if (speed > 0.01 && distToBall > 0.07 && distToBall < 0.18
      && (player.role === 'CB' || player.role === 'CM')) return 'tackle';

  // Target runners and pressers always move
  if (pr === 'target_run' || pr === 'press') return speed > 0.002 ? 'run' : 'walk';

  if (speed > 0.007)  return 'run';
  if (speed > 0.0015) return 'walk';
  return 'idle';
}

/** CSS @keyframes injected into the SVG <defs> once by SoccerPitch. */
export const SPRITE_KEYFRAMES = `
  @keyframes legL-walk    { 0%,100%{transform:translateY(0)}     50%{transform:translateY(3.5px)} }
  @keyframes legR-walk    { 0%,100%{transform:translateY(3.5px)} 50%{transform:translateY(0)} }
  @keyframes body-bob     { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-1.5px)} }
  @keyframes kick-leg     { 0%{transform:translateY(0) rotate(0deg)} 35%{transform:translateY(-7px) rotate(-28deg)} 65%{transform:translateY(4px) rotate(18deg)} 100%{transform:translateY(0) rotate(0deg)} }
  @keyframes save-armL    { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-7px,-9px) rotate(-55deg)} }
  @keyframes save-armR    { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(7px,-9px)  rotate(55deg)} }
  @keyframes cel-jump     { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-6px)} }
  @keyframes cel-armL     { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-3px,-11px) rotate(-72deg)} }
  @keyframes cel-armR     { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(3px,-11px)  rotate(72deg)} }
  @keyframes drib-sway    { 0%,100%{transform:rotate(-7deg)}     50%{transform:rotate(7deg)} }
  @keyframes tackle-lean  { 0%{transform:rotate(0deg)} 55%{transform:rotate(22deg)} 100%{transform:rotate(0deg)} }
`;
