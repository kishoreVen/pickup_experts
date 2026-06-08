import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { GameMode, PlayOutcome, PlayRole, Strategy, TacticalPlan } from '@/lib/types';
import { renderPrompt } from '@/lib/renderPrompt';

const MODE_RULES: Record<GameMode, { players: string; roles: string; area: string }> = {
  '5v5': {
    players: 'Exactly 6 players per team: 1 GK + 5 outfield (e.g. 2 CB, 1 CM, 2 ST).',
    roles:   'GK CB CM ST',
    area:    'Field 40m×25m — compact play. Goal mouth sits between y≈0.43 and y≈0.57.',
  },
  '3v3': {
    players: 'Exactly 4 players per team: 1 GK + 3 outfield (e.g. 1 CB, 1 CM, 1 ST).',
    roles:   'GK CB CM ST',
    area:    'Field 30m×20m — very compact. Goal mouth y≈0.43–0.57.',
  },
  '1v1': {
    players: 'Exactly 1 player per team — NO goalkeeper. Each player attacks the opponent\'s small goal.',
    roles:   'ST',
    area:    'Field 20m×15m — small central goals.',
  },
};

// ── Prompt context builders ───────────────────────────────────────────────────

function planContext(gameMode: GameMode, homeAttacksRight: boolean): Record<string, unknown> {
  const r = MODE_RULES[gameMode];
  return {
    gameMode,
    homeDir: homeAttacksRight ? 'RIGHT' : 'LEFT',
    awayDir: homeAttacksRight ? 'LEFT'  : 'RIGHT',
    players: r.players,
    roles:   r.roles,
    area:    r.area,
  };
}

function animateContext(gameMode: GameMode, homeAttacksRight: boolean): Record<string, unknown> {
  const r = MODE_RULES[gameMode];
  const h = homeAttacksRight;
  return {
    gameMode,
    homeDir:        h ? 'RIGHT (toward x=1.0)' : 'LEFT (toward x=0.0)',
    awayDir:        h ? 'LEFT (toward x=0.0)'  : 'RIGHT (toward x=1.0)',
    homeGKx:        h ? '0.04' : '0.96',
    awayGKx:        h ? '0.96' : '0.04',
    homeGoalLineX:  h ? '0.97' : '0.03',
    awayGoalLineX:  h ? '0.03' : '0.97',
    homeGoalDeepX:  h ? '1.03' : '-0.03',
    awayGoalDeepX:  h ? '-0.03' : '1.03',
    homeSaveX:      h ? '0.88–0.93' : '0.07–0.12',
    awaySaveX:      h ? '0.07–0.12' : '0.88–0.93',
    homeBlockX:     h ? '0.78–0.87' : '0.13–0.22',
    awayBlockX:     h ? '0.13–0.22' : '0.78–0.87',
    homePostRebound: h ? '0.88' : '0.12',
    awayPostRebound: h ? '0.12' : '0.88',
    homeTerribleX:  h ? '0.80' : '0.20',
    awayTerribleX:  h ? '0.20' : '0.80',
    homeZones: h
      ? "own goal area≈0.04 | own box≈0.05–0.18 | defensive third≈0.05–0.33 | own half≈0.05–0.50 | center≈0.50 | opponent's half≈0.50–0.95 | attacking third≈0.67–0.95 | opponent's box≈0.78–0.95 | opponent's goal≈0.97"
      : "own goal area≈0.96 | own box≈0.82–0.95 | defensive third≈0.67–0.95 | own half≈0.50–0.95 | center≈0.50 | opponent's half≈0.05–0.50 | attacking third≈0.05–0.33 | opponent's box≈0.05–0.22 | opponent's goal≈0.03",
    awayZones: h
      ? "own goal area≈0.96 | own box≈0.82–0.95 | defensive third≈0.67–0.95 | own half≈0.50–0.95 | attacking third≈0.05–0.33 | opponent's box≈0.05–0.22"
      : "own goal area≈0.04 | own box≈0.05–0.18 | defensive third≈0.05–0.33 | own half≈0.05–0.50 | attacking third≈0.67–0.95 | opponent's box≈0.78–0.95",
    yZones: 'upper channel≈0.20 | upper-center≈0.35 | center≈0.50 | lower-center≈0.65 | lower channel≈0.80',
    players: r.players,
    area:    r.area,
  };
}

// ── JSON extraction ───────────────────────────────────────────────────────────

function extractJSON(text: string): unknown {
  try { return JSON.parse(text); } catch { /* continue */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ } }
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj)    { try { return JSON.parse(obj[0]); }            catch { /* continue */ } }
  throw new Error('No valid JSON found in AI response');
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, existingStrategy, gameMode = '5v5', homeAttacksRight = true } = body as {
      prompt: string;
      existingStrategy?: Strategy;
      gameMode?: GameMode;
      homeAttacksRight?: boolean;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const anthropicApiKey = request.headers.get('x-api-key') || process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'No API key configured. Add your Anthropic API key in Settings.' },
        { status: 503 },
      );
    }

    const client = new Anthropic({ apiKey: anthropicApiKey });

    // ── Refinement: single call using existing plan as context ────────────────
    if (existingStrategy) {
      const refineMsg = `Refine this existing ${gameMode} strategy.\n\nRequest: ${prompt}\n\nCurrent strategy:\n${JSON.stringify(existingStrategy, null, 2)}`;
      const msg = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     renderPrompt('animate.njk', animateContext(gameMode, homeAttacksRight)),
        messages:   [{ role: 'user', content: refineMsg }],
      });
      const block = msg.content[0];
      if (block.type !== 'text') throw new Error('Unexpected response type from AI');
      const raw = extractJSON(block.text) as RawAnimation;
      return NextResponse.json({ strategy: assembleStrategy(raw, existingStrategy.plan, prompt, gameMode) });
    }

    // ── Generate: call 1 — tactical plan ─────────────────────────────────────
    const planMsg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     renderPrompt('plan.njk', planContext(gameMode, homeAttacksRight)),
      messages:   [{ role: 'user', content: `Create a tactical plan for: ${prompt}` }],
    });
    const planBlock = planMsg.content[0];
    if (planBlock.type !== 'text') throw new Error('Unexpected plan response from AI');
    const plan = extractJSON(planBlock.text) as TacticalPlan;

    // ── Generate: call 2 — animation from plan ────────────────────────────────
    const animMsg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     renderPrompt('animate.njk', animateContext(gameMode, homeAttacksRight)),
      messages:   [{ role: 'user', content: `Animate this tactical plan:\n\n${JSON.stringify(plan, null, 2)}` }],
    });
    const animBlock = animMsg.content[0];
    if (animBlock.type !== 'text') throw new Error('Unexpected animation response from AI');
    const raw = extractJSON(animBlock.text) as RawAnimation;

    return NextResponse.json({ strategy: assembleStrategy(raw, plan, prompt, gameMode) });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate strategy';
    console.error('[generate-strategy]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Types & assembly helpers ──────────────────────────────────────────────────

type RawPlayer = { id: string; number: number; role: string; playRole?: string; keyframes: { time: number; x: number; y: number }[] };
type RawAnimation = {
  title: string;
  description: string;
  duration: number;
  homePlayers: RawPlayer[];
  awayPlayers: RawPlayer[];
  ball: { keyframes: { time: number; x: number; y: number; event?: string }[] };
};

function assembleStrategy(
  raw: RawAnimation,
  plan: TacticalPlan | undefined,
  prompt: string,
  gameMode: GameMode,
): Strategy {
  const outcome      = plan?.outcome as PlayOutcome | undefined;
  const attackingTeam = plan?.attackingTeam;
  const isGoal  = outcome === 'goal_clean' || outcome === 'goal_rebound' || outcome === 'own_goal';
  const isNoGoal = outcome === 'no_goal_saved' || outcome === 'no_goal_blocked' ||
                   outcome === 'no_goal_post'  || outcome === 'no_goal_close'   ||
                   outcome === 'no_goal_terrible';
  // For goals: attacking team scores. For no-goals: defending team wins the moment.
  const scoringTeam: 'home' | 'away' | undefined =
    isGoal   && attackingTeam ? attackingTeam :
    isNoGoal && attackingTeam ? (attackingTeam === 'home' ? 'away' : 'home') :
    undefined;

  return {
    id:          `strategy_${Date.now()}`,
    title:       raw.title,
    description: raw.description,
    duration:    raw.duration,
    outcome,
    scoringTeam,
    plan,
    players: [
      ...(raw.homePlayers ?? []).map(p => ({ ...p, playRole: p.playRole as PlayRole | undefined, team: 'home' as const })),
      ...(raw.awayPlayers ?? []).map(p => ({ ...p, playRole: p.playRole as PlayRole | undefined, team: 'away' as const })),
    ],
    ball: {
      keyframes: raw.ball.keyframes.map(kf => ({
        ...kf,
        event: kf.event as 'pass' | 'shot' | 'cross' | 'dribble' | 'clearance' | undefined,
      })),
    },
    prompt,
    gameMode,
    createdAt: new Date().toISOString(),
  };
}
