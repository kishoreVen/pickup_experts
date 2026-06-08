export interface Keyframe {
  time: number; // milliseconds from animation start
  x: number;    // 0–1: 0 = left goal line, 1 = right goal line
  y: number;    // 0–1: 0 = top touchline, 1 = bottom touchline
}

export interface BallKeyframe extends Keyframe {
  event?: 'pass' | 'shot' | 'cross' | 'dribble' | 'clearance';
}

export type PlayOutcome =
  | 'no_goal_saved'    // keeper makes the save
  | 'no_goal_blocked'  // defender blocks the shot
  | 'no_goal_post'     // hits the post, rebounds out
  | 'no_goal_terrible' // wild shot, well off target
  | 'no_goal_close'    // just wide or over the bar
  | 'goal_clean'       // clean finish into net
  | 'own_goal'         // defender deflects into own net
  | 'goal_rebound';    // rebounds off post and goes in

export type PlayRole =
  | 'ball_carrier'  // has possession, dribbling / driving
  | 'target_run'    // forward run to receive the final ball
  | 'support_run'   // lateral / diagonal run, secondary option
  | 'press'         // aggressive press on the ball carrier
  | 'track'         // tracking an attacker's run
  | 'cover'         // covering defensive depth / space
  | 'gk_active'     // GK directly involved (saving, distributing)
  | 'gk_passive';   // GK not directly involved, positioning only

// ── Tactical plan (call 1 output) ────────────────────────────────────────────

export interface TacticalPlayerPlan {
  id: string;
  number: number;
  role: string;
  playRole: PlayRole;
  startZone: string;  // soccer zone language, e.g. "own penalty area, upper channel"
  movements: string;  // what the player does during the play
}

export interface TacticalBallEvent {
  event: 'pass' | 'shot' | 'cross' | 'dribble' | 'clearance';
  fromId: string;  // player ID who executes the event
  toId?: string;   // receiving player (pass / cross only)
  timing: 'early' | 'mid' | 'late';
  description: string;
}

export interface TacticalPlan {
  outcome: PlayOutcome;
  attackingTeam: 'home' | 'away';
  scenario: string;       // one-sentence play description
  homeShape: string;      // e.g. "1-2-1-2 in transition"
  awayShape: string;      // e.g. "1-2-2-1 mid-block"
  ballEvents: TacticalBallEvent[];
  homePlayers: TacticalPlayerPlan[];
  awayPlayers: TacticalPlayerPlan[];
}

// ── Animation data ────────────────────────────────────────────────────────────

export interface PlayerData {
  id: string;
  number: number;
  role: string;
  playRole?: PlayRole;
  team: 'home' | 'away';
  keyframes: Keyframe[];
}

export interface BallTrack {
  keyframes: BallKeyframe[];
}

export type GameMode = '5v5' | '3v3' | '1v1';

export interface Strategy {
  id: string;
  title: string;
  description: string;
  duration: number; // total animation length in ms
  players: PlayerData[];
  ball: BallTrack;
  outcome?: PlayOutcome;
  scoringTeam?: 'home' | 'away'; // team that scored (if a goal outcome)
  plan?: TacticalPlan;
  prompt?: string;
  createdAt?: string;
  gameMode?: GameMode;
}
