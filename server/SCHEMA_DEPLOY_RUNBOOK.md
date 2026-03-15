# Schema Deploy Runbook

## Migration Hygiene

- Treat every schema change as a numbered migration file under `server/src/migrations/`.
- Deploy schema changes before application changes when new columns, tables, or indexes are required by the new code path.
- Keep migrations forward-only in production; use the `down` function only for local rollback drills.

## Safe Deploy Order

1. Ship schema-first release with additive migrations only.
2. Run migrations and verify the `_migrations` table records the new version.
3. Backfill new ops tables if needed.
4. Deploy application code that starts writing to the new tables.
5. Enable dashboards, smoke checks, and replay tooling.
6. Remove old code paths only after one stable release cycle.

## New Ops Tables Backfill

- `webhook_events_ops`: backfill from the in-memory or historical webhook event archive if available. Store provider, external event id, failure reason, and notes.
- `outbound_webhook_deliveries`: backfill recent replayable outbound jobs first so operators can see current retry state immediately.
- `operator_annotations`: no historical backfill required unless notes exist in tickets or incident docs.
- `incident_log`: seed unresolved incidents from current runbooks or deployment tickets.
- `background_jobs_ops`: insert active queues and long-running jobs before turning on stuck-job alerts.
- `asset_objects`: backfill only durable production assets. Temporary assets can age out under retention.

## Rollout Notes

- Prefer additive migrations: nullable columns, new tables, new indexes.
- Avoid destructive column drops in the same release as app behavior changes.
- For large indexes, schedule off-peak deploy windows.
- Record migration runtime and row counts in deploy notes.

## Verification

- `GET /health`
- `GET /api/v2/ops/overview`
- payment webhook smoke event recorded
- outbound replay route can queue a failed job again
- asset reservation endpoint returns signed/public URL metadata