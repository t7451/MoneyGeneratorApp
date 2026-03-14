import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// Connection pool singleton
let pool = null;
let isConnected = false;

/**
 * Get PostgreSQL connection config
 */
function getConnectionConfig() {
  // Support DATABASE_URL (Railway, Heroku, etc.) or individual params
  if (config.database.url) {
    return {
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: config.database.pool.max,
      min: config.database.pool.min,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  return {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    max: config.database.pool.max,
    min: config.database.pool.min,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

/**
 * Initialize the database connection pool
 */
export async function initDatabase() {
  if (pool) {
    return pool;
  }

  const connectionConfig = getConnectionConfig();
  pool = new Pool(connectionConfig);

  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    isConnected = true;
    console.log('Database connected successfully');
    
    // Run migrations
    await runMigrations();
    
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    // Don't throw - allow app to run without DB in development
    if (config.env === 'production') {
      throw error;
    }
    console.warn('Running without database - using in-memory storage');
    return null;
  }
}

/**
 * Get the database pool
 */
export function getPool() {
  return pool;
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected() {
  return isConnected && pool !== null;
}

/**
 * Execute a query
 */
export async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.env === 'development' && duration > 100) {
      console.log('Slow query:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Query error:', { text, error: error.message });
    throw error;
  }
}

/**
 * Execute a query and return single row
 */
export async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 */
export async function queryAll(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    console.log('Database connection closed');
  }
}

/**
 * Migration management
 */
const migrations = [];

export function registerMigration(version, name, up, down) {
  migrations.push({ version, name, up, down });
}

async function runMigrations() {
  if (!pool) return;
  
  // Create migrations table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      version INTEGER NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Get applied migrations
  const applied = await queryAll('SELECT version FROM _migrations ORDER BY version');
  const appliedVersions = new Set(applied.map(m => m.version));
  
  // Sort migrations by version
  const pending = migrations
    .filter(m => !appliedVersions.has(m.version))
    .sort((a, b) => a.version - b.version);
  
  if (pending.length === 0) {
    console.log('Database migrations up to date');
    return;
  }
  
  console.log(`Running ${pending.length} pending migrations...`);
  
  for (const migration of pending) {
    console.log(`  Running migration ${migration.version}: ${migration.name}`);
    
    await transaction(async (client) => {
      await migration.up(client);
      await client.query(
        'INSERT INTO _migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
    });
  }
  
  console.log('Migrations complete');
}

// Export for use in other modules
export const db = {
  init: initDatabase,
  close: closeDatabase,
  query,
  queryOne,
  queryAll,
  transaction,
  getPool,
  isConnected: isDatabaseConnected,
  registerMigration,
};

export default db;
