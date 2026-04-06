export interface Keyframe {
  time: number; // milliseconds from animation start
  x: number;    // 0–1: 0 = left goal line, 1 = right goal line
  y: number;    // 0–1: 0 = top touchline, 1 = bottom touchline
}

export interface BallKeyframe extends Keyframe {
  event?: 'pass' | 'shot' | 'cross' | 'dribble' | 'clearance';
}

export interface PlayerData {
  id: string;
  number: number;
  role: string;
  team: 'home' | 'away';
  keyframes: Keyframe[];
}

export interface BallTrack {
  keyframes: BallKeyframe[];
}

export interface Strategy {
  id: string;
  title: string;
  description: string;
  duration: number; // total animation length in ms
  players: PlayerData[];
  ball: BallTrack;
  prompt?: string;
  createdAt?: string;
}
