# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A SaaS platform for gig economy workers to manage income, track mileage, handle taxes, connect to gig platforms (Plaid, Stripe), manage teams, and monetize via subscriptions. Has a public-facing storefront for end-customers.

## Commands

```bash
# Root-level (delegates to web/ or server/)
npm run dev              # Web dev server (port 3000)
npm run build            # tsc + vite build (web)
npm run build:budget     # Build with strict bundle size enforcement (fails on violation)
npm run lint             # ESLint on web/
npm test                 # Server Jest tests

# Server tests (from server/)
npm test -- --testPathPattern=v2.test.js       # Single test file
npm test -- --testNamePattern="should return 200"  # Single test by name

# Verification
npm run provision:check  # Check env provisioning
npm run smoke:prod       # Smoke check production API
```

## Architecture

```
web/        React 18 SPA (TypeScript, Vite 7) → Netlify
server/     Express.js API (Node.js ESM) → Railway/Render
scripts/    Provisioning and smoke-check scripts
```

### Frontend (`web/src/`)

- **State**: Context-based (no Redux/Zustand). Providers in `App.tsx`: `AuthContext`, `AppContext`, `ThemeContext`, `OnboardingProvider`
- **API calls**: All through `lib/apiClient.ts` → `apiFetchJson<T>(path, options)`. Reads `auth_token` from localStorage, fires `moneygen:auth-expired` on 401
- **Routing**: React Router v7. Public: `/login`, `/register`, `/storefront/:accountId`. Everything else protected via `ProtectedRoute` inside `AppLayout`. Unonboarded users see `OnboardingWizard` instead
- **All pages lazy-loaded** via `React.lazy()`. Named exports use: `lazy(async () => ({ default: (await import('./pages/X')).X }))`
- **Styling**: Co-located CSS per component (e.g., `Button.tsx` + `Button.css`). Design tokens in `styles/designSystem.css`. Icons via `lucide-react`
- **Bundle budgets**: Custom Vite plugin in `vite.config.ts`. Entry JS ≤80kB, route chunks ≤50kB, vendor-react ≤200kB. `build:budget` fails CI on violations
- **Env vars**: `VITE_API_URL` (backend URL, empty = same origin), `VITE_V2_ENABLED`. Vite proxies `/api/*` and `/auth/*` to backend in dev

### Backend (`server/src/`)

- **ESM only** — all imports must use `.js` extensions on relative paths
- **Routes** mounted in `app.js`: `/auth/*` (auth.js, stricter rate limit), `/api/v1/*` (api.js), `/api/v2/*` (v2.js), `/api/payments/*` (payments.js), `/api/connect/*` (connect.js), `/api/connect/webhooks` (connectWebhooks.js)
- **Auth middleware**: `requireUser` (JWT or static token), `requireAdmin` (role check). In non-production, `userId` in request body accepted as test shortcut
- **Database**: PostgreSQL via `pg` Pool. Falls back to in-memory Maps (`src/models.js`) if DB unavailable. Migrations in `src/migrations/`
- **Services** in `services/` are domain modules called directly from routes (authService, stripeService, stripeConnectService, taxService, mileageService, etc.)
- **Validation**: Zod schemas in `validation.js`. Use `validate(schema)` middleware for body, `validateQuery(schema)` for query params
- **Caching**: `cacheMiddleware(ttlSeconds)` for response caching; `cacheUtils.invalidatePattern()` to bust cache
- **Response conventions**: Success: `{ success: true, data: {...} }`. Error: `{ error: "message" }` with appropriate HTTP status

### Deployment

- **Frontend**: Netlify. Build gated by `npm run build:budget`. Config in `netlify.toml`
- **Backend**: Railway/Render via Docker (`server/Dockerfile`). Health check at `GET /health`
- **Netlify Functions**: `web/netlify/functions/` — `proxy-api.js` (API caching proxy), `mcp.js` (MCP endpoint)
- **Netlify redirects**: `/api/v1/*` and `/api/v2/*` proxy to `https://api.moneygenerator.app`, `/mcp` routes to the MCP function

## Key Conventions

- Context hooks (`useAuth`, `useAppContext`, `useTheme`) throw if called outside their provider
- Named component/page exports (not default), except `App.tsx`
- New features should handle both DB and in-memory model paths, or use services that abstract this
- Stripe Connect (connected accounts, products, checkout) is separate from main Stripe payments
- Auth tokens stored in localStorage: `auth_token`, `auth_user`, `userId`
- Pre-commit hooks run ESLint + Prettier on staged files via Husky + lint-staged
