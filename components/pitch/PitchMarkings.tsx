'use client';

import { PitchConfig, HOME_COLOR, AWAY_COLOR } from '@/lib/pitch';

export function PitchMarkings({ cfg }: { cfg: PitchConfig }) {
  const { pw, ph, goalH, goalD, goalBoxW, goalBoxH, pad, centerR, stripes } = cfg;
  const line  = { stroke: 'rgba(255,255,255,0.82)', strokeWidth: 2, fill: 'none' } as const;
  const thick = { stroke: 'rgba(255,255,255,0.9)',  strokeWidth: 3, fill: 'none' } as const;
  const goalY    = ph / 2 - goalH / 2;
  const goalBoxY = ph / 2 - goalBoxH / 2;
  const stripeW  = pw / stripes;

  return (
    <g>
      {/* surround */}
      <rect x={-pad} y={-pad} width={pw + pad * 2} height={ph + pad * 2} fill="#172a1e" />

      {/* grass stripes */}
      {Array.from({ length: stripes }, (_, i) => (
        <rect key={i} x={i * stripeW} y={0} width={stripeW} height={ph}
              fill={i % 2 === 0 ? '#2c5f2e' : '#316633'} />
      ))}

      {/* boundary */}
      <rect x={0} y={0} width={pw} height={ph} {...thick} />

      {/* halfway line + centre circle */}
      <line x1={pw / 2} y1={0} x2={pw / 2} y2={ph} {...line} />
      {centerR > 0 && <circle cx={pw / 2} cy={ph / 2} r={centerR} {...line} />}
      <circle cx={pw / 2} cy={ph / 2} r={4} fill="rgba(255,255,255,0.88)" />

      {/* left goal */}
      <rect x={-goalD} y={goalY} width={goalD} height={goalH}
            fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
      {goalBoxW > 0 && <rect x={0} y={goalBoxY} width={goalBoxW} height={goalBoxH} {...line} />}
      <rect x={-goalD - 4} y={goalY - 6} width={5} height={goalH + 12} rx={2} fill={HOME_COLOR} opacity={0.7} />

      {/* right goal */}
      <rect x={pw} y={goalY} width={goalD} height={goalH}
            fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
      {goalBoxW > 0 && <rect x={pw - goalBoxW} y={goalBoxY} width={goalBoxW} height={goalBoxH} {...line} />}
      <rect x={pw + goalD - 1} y={goalY - 6} width={5} height={goalH + 12} rx={2} fill={AWAY_COLOR} opacity={0.7} />

      {/* corner arcs */}
      <path d={`M 8 0 A 8 8 0 0 0 0 8`}               {...line} />
      <path d={`M ${pw - 8} 0 A 8 8 0 0 1 ${pw} 8`}   {...line} />
      <path d={`M 0 ${ph - 8} A 8 8 0 0 1 8 ${ph}`}   {...line} />
      <path d={`M ${pw} ${ph - 8} A 8 8 0 0 0 ${pw - 8} ${ph}`} {...line} />
    </g>
  );
}
