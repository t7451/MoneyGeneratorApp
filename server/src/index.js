import 'dotenv/config';
import app from './app.js';
import { config } from './config.js';
import { setupGracefulShutdown } from './shutdown.js';
import { initDatabase, closeDatabase } from './database.js';

// Register migrations
import './migrations/index.js';

const PORT = process.env.BACKEND_PORT || 4000;

async function startServer() {
  // Initialize database (optional - app works without it)
  try {
    await initDatabase();
  } catch (error) {
    console.warn('Database initialization skipped:', error.message);
    console.log('Continuing without database - using in-memory storage');
  }
  
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${config.env} mode)`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Process ID: ${process.pid}`);
  });

  // Setup graceful shutdown
  setupGracefulShutdown(server, async () => {
    await closeDatabase();
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
