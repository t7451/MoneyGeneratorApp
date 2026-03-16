# Money Generator App

React 18 frontend plus Node.js/Express backend for gig workers, freelancers, and operators to manage earnings, expenses, subscriptions, integrations, and storefront flows.

Status: Active development  
Latest release: v1.3.1 (March 16, 2026)

## Overview

Money Generator App helps users:

- Track income, expenses, subscriptions, mileage, and financial health.
- Browse jobs and switch into an on-demand map experience when needed.
- Generate reports and manage tax-adjacent workflows.
- Connect payment, payout, and banking integrations.
- Publish storefront experiences for customer purchases.

## Stack

### Frontend

- React 18 with TypeScript
- Vite 7
- React Router 7
- Context-based state management
- Lucide React icons
- Custom SVG report previews
- MapLibre GL for the Jobs map, loaded only when the user selects map view

### Backend

- Node.js 20+
- Express.js (ESM)
- PostgreSQL via `pg` with in-memory fallback support
- Zod validation
- JWT auth plus static operator tokens for ops routes
- Stripe, Stripe Connect, Plaid, and PayPal integrations

## Repository Layout

```text
MoneyGeneratorApp/
├── web/                     React SPA
│   ├── src/
│   │   ├── components/      Reusable UI and flows
│   │   ├── context/         App, auth, theme, and onboarding providers
│   │   ├── data/            Static and mock data
│   │   ├── layouts/         Authenticated layout shell
│   │   ├── lib/             API client and helpers
│   │   ├── pages/           Route pages
│   │   ├── styles/          Active design system and shared CSS
│   │   ├── App.tsx          Route composition and providers
│   │   └── main.tsx         Entry point
│   ├── package.json
│   └── vite.config.ts       Bundle budgets and chunk strategy
├── server/                  Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── __tests__/
│   └── package.json
├── scripts/                 Provisioning and smoke checks
├── CHANGELOG.md
├── PRODUCTION_OPERATIONS_RUNBOOK.md
├── RELEASE_CHECKLIST.md
├── POST_DEPLOYMENT_CHECKLIST.md
├── RELEASE_NOTES_V1.3.1.md
└── TESTING_GUIDE.md
```

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
npm install --prefix web
npm install --prefix server
```

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

### Run

Frontend from the repo root:

```bash
npm run dev
```

Backend from the repo root:

```bash
npm run dev --prefix server
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Commands

### Root

```bash
npm run dev
npm run build
npm run build:budget
npm run analyze
npm run lint
npm test
npm run provision
npm run provision:check
npm run smoke:prod
```

### Web

```bash
npm run dev
npm run build
npm run analyze
npm run lint
```

### Server

```bash
npm run dev
npm test
```

## Environment Variables

### Frontend (`web/.env.local`)

```bash
VITE_API_URL=http://localhost:4000
VITE_V2_ENABLED=true
```

### Backend (`server/.env`)

Copy `server/.env.example` to `server/.env` and populate the real values.

Core variables:

```bash
PORT=4000
BACKEND_PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=...
DATABASE_URL=postgresql://...
AUTH_ADMIN_TOKEN=...
AUTH_USER_TOKEN=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_CONNECT_WEBHOOK_SECRET=...
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=...
PAYPAL_WEBHOOK_SECRET=...
PLAID_WEBHOOK_SECRET=...
```

## Verification

Release-facing checks for v1.3.1:

- `npm test` passes the backend Jest suite.
- `npm run build:budget` is the frontend release gate.
- Root, frontend, and backend dependency audits are clean.
- Release docs align with the shipped code and current deployment topology.

Production smoke tooling:

- `npm run smoke:prod` runs the lightweight API smoke checks.
- `scripts/prod-verify.sh` runs the full 10-step production verification flow on Unix-like shells.
- `do-verify.bat` runs the same production verification flow on Windows.

See `RELEASE_CHECKLIST.md`, `POST_DEPLOYMENT_CHECKLIST.md`, `PRODUCTION_OPERATIONS_RUNBOOK.md`, and `TESTING_GUIDE.md` for the full release and smoke flow.

## Production Endpoints

- Web: `https://moneygenerator.app`
- Production API: `https://api.moneygenerator.app`
- Preview API: `https://staging-api.moneygenerator.app`

## Performance Notes

- Entry CSS is approximately 30.64 kB in the validated strict budget build.
- SVG report previews replaced Recharts in v1.3.1.
- The Jobs map uses MapLibre only when the map view is selected and the map container nears the viewport.

## Key Routes

- `/login`, `/register`
- `/`
- `/jobs`
- `/reports`
- `/settings`
- `/connect/dashboard`
- `/storefront/:accountId`

## Troubleshooting

### Backend not reachable

- Check `http://localhost:4000/health`.
- Verify `VITE_API_URL` points to the backend.
- Confirm the backend process is running.

### Port already in use

```bash
netstat -ano | findstr :3000
netstat -ano | findstr :4000
```

### Clean reinstall

```bash
rm -rf node_modules web/node_modules server/node_modules
npm install
npm install --prefix web
npm install --prefix server
```

## Version Notes

### v1.3.1

- Removed Recharts in favor of custom SVG previews.
- Removed the unused `vite-plugin-pwa` dependency chain.
- Tightened bundle-budget enforcement.
- Reduced always-on CSS and removed stale frontend structure.

See `CHANGELOG.md` for full release history.

```bash
netstat -ano | findstr :3000
netstat -ano | findstr :4000
```

### Clean reinstall

```bash
rm -rf node_modules web/node_modules server/node_modules
npm install
npm install --prefix web
npm install --prefix server
```

## Version Notes

### v1.3.1

- Removed Recharts in favor of custom SVG previews.
- Removed the unused vite-plugin-pwa dependency chain.
- Tightened bundle-budget enforcement.
- Reduced always-on CSS and removed stale frontend structure.

See CHANGELOG.md for full release history.
