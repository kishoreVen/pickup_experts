import { GameMode } from './types';

export type PitchConfig = {
  pw: number;       // pitch width (SVG units)
  ph: number;       // pitch height
  goalH: number;    // goal opening height
  goalD: number;    // goal depth
  goalBoxW: number; // goal-area box depth (0 = none)
  goalBoxH: number; // goal-area box height
  pad: number;      // viewBox padding
  centerR: number;  // centre circle radius (0 = none)
  stripes: number;  // grass stripe count
};

export const CONFIGS: Record<GameMode, PitchConfig> = {
  '5v5': { pw: 400, ph: 250, goalH: 36, goalD: 20, goalBoxW: 50, goalBoxH: 100, pad: 32, centerR: 35, stripes: 4 },
  '3v3': { pw: 300, ph: 200, goalH: 28, goalD: 16, goalBoxW: 38, goalBoxH: 78,  pad: 28, centerR: 28, stripes: 3 },
  '1v1': { pw: 210, ph: 160, goalH: 22, goalD: 14, goalBoxW: 0,  goalBoxH: 0,   pad: 24, centerR: 0,  stripes: 2 },
};

export const HOME_COLOR  = '#ef4444';
export const AWAY_COLOR  = '#3b82f6';
export const GK_COLOR    = '#84cc16';
export const HOME_SHORTS = '#7f1d1d';
export const AWAY_SHORTS = '#1e3a8a';
export const GK_SHORTS   = '#365314';

export function toSVG(x: number, y: number, pw: number, ph: number) {
  return { sx: x * pw, sy: y * ph };
}

export function svgPoint(
  e: { clientX: number; clientY: number },
  svg: SVGSVGElement,
  pw: number,
  ph: number,
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
