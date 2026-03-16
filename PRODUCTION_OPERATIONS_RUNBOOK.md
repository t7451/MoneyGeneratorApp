# Production Operations Runbook

## Canonical Endpoints

- Web app: `https://moneygenerator.app`
- Production API: `https://api.moneygenerator.app`
- Preview API: `https://staging-api.moneygenerator.app`

## Credential Sources

- Operator smoke token: Railway service variable `AUTH_ADMIN_TOKEN`
- User smoke token: Railway service variable `AUTH_USER_TOKEN`
- Session/JWT signing secret: Railway service variable `JWT_SECRET`
- Stripe server key: Railway service variable `STRIPE_SECRET_KEY`
- Stripe webhook secret: Railway service variable `STRIPE_WEBHOOK_SECRET`
- Stripe Connect webhook secret: Railway service variable `STRIPE_CONNECT_WEBHOOK_SECRET`
- PayPal webhook secret: Railway service variable `PAYPAL_WEBHOOK_SECRET`
- Plaid webhook secret: Railway service variable `PLAID_WEBHOOK_SECRET`

Do not copy secret values into notes, tickets, or chat logs. For CLI smoke checks, export only the operator token into the local shell session.

## Pre-Smoke Setup

Use a shell session with these variables populated:

```bash
SMOKE_BASE_URL=https://api.moneygenerator.app
SMOKE_OPERATOR_TOKEN=<AUTH_ADMIN_TOKEN from Railway>
```

If you are checking the frontend manually, open:

- `https://moneygenerator.app`
- `https://moneygenerator.app/storefront/<accountId>`

## API Smoke Commands

### Health

```bash
curl -i https://api.moneygenerator.app/health
```

Expected:

- HTTP 200
- JSON body with `status: "ok"`
- Metrics and uptime fields present

### Catalog

```bash
curl -i https://api.moneygenerator.app/catalog
```

Expected:

- HTTP 200
- JSON payload with products/plans data

### Operator Overview

```bash
curl -i https://api.moneygenerator.app/api/v2/ops/overview \
  -H "Authorization: Bearer $SMOKE_OPERATOR_TOKEN"
```

Expected:

- HTTP 200 with a valid operator token
- HTTP 403 or 401 means the wrong token was used or the token is missing

### Asset Upload Reservation

```bash
curl -i https://api.moneygenerator.app/api/v2/assets/upload-url \
  -H "Content-Type: application/json" \
  -d '{"userId":"smoke-user","purpose":"receipt","filename":"smoke-receipt.jpg","contentType":"image/jpeg"}'
```

Expected:

- HTTP 200
- JSON payload with upload reservation fields

### Repo Smoke Script

```bash
SMOKE_BASE_URL=https://api.moneygenerator.app \
SMOKE_OPERATOR_TOKEN=$SMOKE_OPERATOR_TOKEN \
npm run smoke:prod
```

This script checks:

- `GET /health`
- `GET /catalog`
- `GET /api/v2/ops/overview` when `SMOKE_OPERATOR_TOKEN` is set
- `POST /api/v2/assets/upload-url`

## Frontend Smoke Flow

Run these checks against `https://moneygenerator.app`:

1. Load the app shell and confirm there is no blank screen or immediate console error.
2. Sign in with a real production account.
3. Confirm expired auth redirects to `/login`.
4. Confirm authenticated dashboard load at `/`.
5. Open `/reports` and confirm SVG report previews render.
6. Open `/jobs`, confirm list view loads, then switch to map view.
7. Confirm the interactive map only initializes after map view is selected and the map area enters view.
8. Open `/connect/dashboard` and confirm the page renders without a blank state.
9. Open a real storefront path at `/storefront/:accountId` and validate the public page loads.

## Payments And Webhooks

### Replay-Safe Handling

- Every inbound webhook must be keyed by provider event id before fulfillment.
- Duplicate events should acknowledge with success and remain visible in ops views.
- Replay outbound jobs only through operator tooling so replay outcomes are recorded.

### Partial Failure Recovery

#### Bookings

1. Confirm the booking payment event exists in webhook history.
2. Check whether fulfillment was written but notification dispatch failed.
3. Add an operator annotation with the affected booking id.
4. Replay only the notification or downstream webhook step.

#### Credit Purchases

1. Confirm the customer charge is settled.
2. Check whether credit ledger mutation happened exactly once.
3. If uncertain, freeze replay until the balance delta is reconciled.
4. Record the final adjustment in operator annotations.

## Queue And Worker Reliability

- Heartbeat background jobs through `POST /api/v2/ops/background-jobs/:jobKey/heartbeat`.
- Investigate running jobs with stale heartbeats before replaying them.
- Escalate when the same job retries more than 5 times or remains stale for 15 minutes.

## Operator Search And Notes

- Use `GET /api/v2/ops/search?q=...` for incidents, annotations, and replay outcomes.
- Add operator notes for customer-impacting failures before manual intervention.

## Asset Storage

- Reserve uploads through `POST /api/v2/assets/upload-url`.
- Temporary assets should use retention class `temporary` and be swept after expiry.
- Public assets should only use public URLs when the content is intentionally world-readable.

## Failure Triggers

Escalate immediately if any of the following occurs:

- `https://api.moneygenerator.app/health` is not returning 200
- `/api/v2/ops/overview` fails with a known-good admin token
- storefront pages fail to render for public customers
- Jobs list works but map initialization crashes the page
- webhook processing shows duplicate fulfillment rather than duplicate acknowledgement
