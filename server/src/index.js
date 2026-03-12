import 'dotenv/config';
import app from './app.js';
import { config } from './config.js';
import { setupGracefulShutdown } from './shutdown.js';

const PORT = process.env.BACKEND_PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${config.env} mode)`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Process ID: ${process.pid}`);

const PORT = process.env.BACKEND_PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${config.env} mode)`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Setup graceful shutdown
setupGracefulShutdown(server);
