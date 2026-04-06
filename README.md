# Pickup Experts — Soccer Tactics Board

AI-powered animated soccer strategy builder. Describe a play, watch it come to life in a Football Manager-style 2D pitch.

## Getting Started

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values you need.

### Minimum to test locally (done ✓)
```
ANTHROPIC_API_KEY=...        # Enables server-side AI generation for Pro users
```

### To enable Auth + Saves (Supabase)
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the **SQL Editor**
3. Go to **Authentication → Providers** → enable **Google** and **GitHub**
   - Each needs OAuth app credentials (Google Cloud Console / GitHub Developer Settings)
   - OAuth callback URL to register in each provider: `https://<your-project>.supabase.co/auth/v1/callback`
4. Copy from **Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # Settings → API → service_role (keep secret)
```

### To enable Stripe subscriptions ($0.99/month)
1. Create a product **Pickup Experts Pro** at $0.99/month (recurring) in the Stripe dashboard
2. Add a webhook endpoint → `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

## How it works

| Feature | How |
|---|---|
| AI generation | User's own Anthropic key (Settings) or server key (Pro subscribers) |
| Auth | Supabase OAuth — Google + GitHub |
| Saves | Supabase `strategies` table (logged in) or localStorage (guest) |
| Sharing | Full strategy encoded in URL hash — no login required |
| Payments | Stripe subscription → webhook flips `profiles.subscription_tier = 'pro'` |

## Key files

```
app/
  page.tsx                        Main app — animation loop, state, save/share
  api/generate-strategy/route.ts  Claude API endpoint (key gating logic here)
  api/stripe/                     checkout / portal / webhook routes
  auth/callback/route.ts          Supabase OAuth code exchange

components/
  SoccerPitch.tsx                 SVG pitch, player animation, drag-to-edit
  PromptPanel.tsx                 AI prompt, My Plays tab
  Header.tsx                      Nav bar, auth area
  AuthModal.tsx                   Google/GitHub sign-in modal
  SettingsModal.tsx               API key input + subscription management
  UserMenu.tsx                    Avatar dropdown

lib/
  types.ts                        Strategy, PlayerData, BallTrack types
  strategyUtils.ts                Keyframe interpolation, share encoding, demo strategy
  supabase/client.ts              Browser Supabase client (singleton)
  supabase/server.ts              Server Supabase client (per-request)

supabase/schema.sql               Run this once in Supabase SQL Editor
middleware.ts                     Refreshes Supabase auth session on every request
```
