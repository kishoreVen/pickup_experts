# Prompt Pipeline

How a user's free-text input becomes an animated soccer strategy.

---

## Overview

```
User input (text)
    │
    ▼
1. Attack direction parser          (app/page.tsx – parseAttackDirection)
    │
    ▼
2. Mode + direction bundled         (app/page.tsx – callAPI)
    │
    ▼
3. System prompt builder            (app/api/generate-strategy/route.ts – buildSystemPrompt)
    │
    ▼
4. Claude (claude-sonnet-4-6)       (Anthropic SDK)
    │
    ▼
5. JSON extractor + validator       (route.ts – extractJSON)
    │
    ▼
6. Strategy object → React state   (app/page.tsx – setStrategy)
    │
    ▼
7. SVG renderer                     (components/SoccerPitch.tsx + sub-components)
```

---

## Step 1 — Attack Direction Parser

**File:** `app/page.tsx` › `parseAttackDirection(prompt)`

Before the API call is made, the raw prompt is scanned for natural-language direction cues using four regexes:

| Pattern | Resolves to |
|---|---|
| `(home\|red) … (attack\|go\|play\|start) … right` | home attacks right (→) |
| `(home\|red) … (attack\|go\|play\|start) … left` | home attacks left (←) |
| `(away\|blue) … (attack\|go\|play\|start) … left` | home attacks right (→) |
| `(away\|blue) … (attack\|go\|play\|start) … right` | home attacks left (←) |

Returns `true` (home attacks right), `false` (home attacks left), or `null` (no cue found).

If a direction is detected it is written to `homeAttacksRightRef.current` **synchronously** before the fetch fires, so the request body always uses the correct value even though `setHomeAttacksRight` is async.

If `null`, the current toggle state is used unchanged.

---

## Step 2 — Request Body

**File:** `app/page.tsx` › `callAPI`

```ts
{
  prompt: string,           // raw user text
  existingStrategy?: ...,   // present on "Refine" calls only
  gameMode: '5v5'|'3v3'|'1v1',
  homeAttacksRight: boolean
}
```

For **Generate**, `userMessage` is:
> `"Create an animated 5v5 strategy for: <prompt>"`

For **Refine**, `userMessage` prepends the existing strategy JSON:
> `"Refine this existing 5v5 strategy.\n\nRefinement request: <prompt>\n\nCurrent strategy JSON: ..."`

---

## Step 3 — System Prompt Builder

**File:** `app/api/generate-strategy/route.ts` › `buildSystemPrompt(gameMode, homeAttacksRight)`

The system prompt is generated fresh for every request. Its four sections are:

### 3a. Output schema
A concrete JSON example showing the exact shape Claude must return:
- `title`, `description`, `duration` (ms)
- `homePlayers[]` and `awayPlayers[]` — each with `id`, `number`, `role`, `keyframes[]`
- `ball.keyframes[]` — each with `time`, `x`, `y`, optional `event`

### 3b. Coordinate system (direction-aware)
All spatial language is derived from `homeAttacksRight`:

```
homeAttacksRight = true            homeAttacksRight = false
─────────────────────────          ──────────────────────────
HOME attacks RIGHT (→ x=1.0)      HOME attacks LEFT (← x=0.0)
HOME starts: left half x<0.5      HOME starts: right half x>0.5
Home GK at x≈0.04                 Home GK at x≈0.96
Home goal at x=0.97               Home goal at x=0.03
```

This means the AI never needs to know about the toggle — it only sees absolute coordinates and "home attacks right/left".

### 3c. Game mode rules
Injected from `MODE_RULES[gameMode]`:
- Player counts and role suggestions
- Field dimensions and recommended coordinate bounds

### 3d. Hard rules
- Player ID naming (`h1`, `h2` … / `a1`, `a2` …)
- Duration range (5000–10000 ms)
- Coordinate clamp (x 0.02–0.98, y 0.04–0.96)
- Ball keyframes must match player positions at the same time
- Valid `event` values: `pass | shot | cross | dribble | clearance`
- **GOAL rule**: ball's final keyframe must be inside the goal mouth (e.g. `x=0.97, y=0.50`) and the preceding keyframe must carry `event: "shot"`

---

## Step 4 — Claude call

Model: `claude-sonnet-4-6`, `max_tokens: 4096`.

The system prompt constrains output to pure JSON; `extractJSON()` handles cases where Claude wraps the response in markdown fences or adds preamble text.

---

## Step 5 — JSON extraction + normalisation

**File:** `route.ts` › `extractJSON`

Three fallback strategies in order:
1. Direct `JSON.parse(text)`
2. Strip ` ```json ... ``` ` fences, parse inner text
3. Regex-grab the first `{ … }` block, parse it

After extraction, `homePlayers` and `awayPlayers` are merged into a single `players[]` array with a `team: 'home'|'away'` discriminator, and `ball.keyframes[].event` is narrowed to the union type.

---

## Step 6 — Rendering

The `Strategy` object flows into `SoccerPitch.tsx`. Each frame, `currentTime` is used to interpolate player and ball positions from their keyframe arrays. The `getAnimState()` function in `lib/animation.ts` derives per-player animation states (walk, run, kick, dribble, save, tackle, celebrate) from velocity and proximity to the ball.

Trajectory lines (dashed arrows) are visible only when the animation is **paused**; they hide during playback.

---

## Quick reference — prompt examples

| User types | Effect |
|---|---|
| `"quick counter, red attacks left"` | direction flips; AI generates counter-attack leftward |
| `"home scores with a header"` | direction unchanged; AI places ball at home's goal mouth |
| `"blue plays a through ball"` | direction unchanged; away team runs a through-ball move |
| `"refine: make the striker faster"` | **Refine** path; existing strategy JSON sent alongside |
