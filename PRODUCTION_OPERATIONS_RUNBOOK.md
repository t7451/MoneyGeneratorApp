# Production Operations Runbook

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

#### FORGE3D Orders

1. Confirm payment capture first.
2. Verify render/order provisioning state.
3. If payment succeeded but asset/render fulfillment failed, open an incident and annotate the order.
4. Replay fulfillment only after the underlying storage or worker issue is fixed.

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

## Smoke Checks

- `GET /health`
- `GET /api/v2/ops/overview`
- auth login + expired token redirect verification
- subscription stats route with operator/admin credentials
- `POST /api/v2/assets/upload-url`