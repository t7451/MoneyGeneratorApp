import { registerMigration } from '../database.js';

registerMigration(11, 'create_ops_tables', async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS webhook_events_ops (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider VARCHAR(50) NOT NULL,
      external_event_id VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'processed',
      correlation_id VARCHAR(255),
      payload JSONB NOT NULL DEFAULT '{}',
      failure_reason TEXT,
      notes JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, external_event_id)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS outbound_webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id VARCHAR(255) NOT NULL,
      target_url TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      correlation_id VARCHAR(255),
      payload JSONB NOT NULL DEFAULT '{}',
      error_class VARCHAR(255),
      error_message TEXT,
      last_attempt_at TIMESTAMP WITH TIME ZONE,
      delivered_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS operator_annotations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_type VARCHAR(100) NOT NULL,
      target_id VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS incident_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source VARCHAR(100) NOT NULL,
      severity VARCHAR(50) NOT NULL DEFAULT 'warning',
      title VARCHAR(255) NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS background_jobs_ops (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_key VARCHAR(255) NOT NULL UNIQUE,
      queue_name VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_heartbeat_at TIMESTAMP WITH TIME ZONE,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      failure_reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS asset_objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255),
      purpose VARCHAR(100) NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      bucket VARCHAR(255) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      visibility VARCHAR(20) NOT NULL DEFAULT 'private',
      content_type VARCHAR(255),
      original_filename VARCHAR(255),
      public_url TEXT,
      signed_url TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      retention_class VARCHAR(50) NOT NULL DEFAULT 'temporary',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    )
  `);

  await client.query('CREATE INDEX IF NOT EXISTS idx_webhook_events_ops_provider ON webhook_events_ops(provider)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_outbound_webhook_deliveries_status ON outbound_webhook_deliveries(status)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_operator_annotations_target ON operator_annotations(target_type, target_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_incident_log_status ON incident_log(status, severity)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_background_jobs_ops_status ON background_jobs_ops(status, queue_name)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_asset_objects_retention ON asset_objects(retention_class, expires_at)');
}, async (client) => {
  await client.query('DROP TABLE IF EXISTS asset_objects CASCADE');
  await client.query('DROP TABLE IF EXISTS background_jobs_ops CASCADE');
  await client.query('DROP TABLE IF EXISTS incident_log CASCADE');
  await client.query('DROP TABLE IF EXISTS operator_annotations CASCADE');
  await client.query('DROP TABLE IF EXISTS outbound_webhook_deliveries CASCADE');
  await client.query('DROP TABLE IF EXISTS webhook_events_ops CASCADE');
});