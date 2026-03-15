# Release Checklist

## Pre-Deploy

1. Run frontend production build.
2. Run backend test suite.
3. Review dependency updates and security advisories.
4. Confirm required env vars for database, Stripe, webhooks, and object storage.

## Schema First

1. Deploy migration-only release if schema changed.
2. Verify `_migrations` contains the latest version.
3. Run backfills for ops or asset tables if required.

## App Deploy

1. Deploy backend.
2. Deploy frontend.
3. Confirm `PORT`-based startup and health endpoint responsiveness.

## Smoke Tests

1. `GET /health`
2. Auth login, logout, and expired-session redirect flow.
3. Payment checkout or billing smoke test.
4. Webhook ingest smoke event plus replay visibility.
5. Admin/operator overview route.
6. Analytics and monitoring dashboard check.
7. Asset upload reservation endpoint.

## Post-Deploy

1. Check request/error logs with correlation ids.
2. Review queue health and recent incidents.
3. Verify no stuck background jobs.
4. Confirm payment failures and webhook duplicates are visible in ops surfaces.

## Ongoing Governance

1. Review dependencies and security posture at least monthly.
2. Review runbooks after every incident.
3. Remove deprecated code paths only after one stable release cycle.