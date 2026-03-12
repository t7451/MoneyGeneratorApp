// Graceful shutdown handler
let isShuttingDown = false;
const connections = new Set();

export function setupGracefulShutdown(server) {
  // Track connections
  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => {
      connections.delete(conn);
    });
  });

  // Shutdown handler
  async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
    });

    // Set timeout for forceful shutdown
    const forceTimeout = setTimeout(() => {
      console.error('Forceful shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 seconds

    try {
      // Close existing connections gracefully
      for (const conn of connections) {
        conn.end();
      }

      // Wait a bit for connections to close
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Destroy remaining connections
      for (const conn of connections) {
        conn.destroy();
      }

      console.log('All connections closed. Exiting...');
      clearTimeout(forceTimeout);
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      clearTimeout(forceTimeout);
      process.exit(1);
    }
  }

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// Health check middleware that respects shutdown state
export function healthCheckMiddleware(req, res, next) {
  if (isShuttingDown) {
    return res.status(503).json({ 
      status: 'shutting_down',
      message: 'Server is shutting down'
    });
  }
  next();
}
