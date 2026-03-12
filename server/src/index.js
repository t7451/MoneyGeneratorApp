import 'dotenv/config';
import app from './app.js';
import { config } from './config.js';

const PORT = process.env.BACKEND_PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${config.env} mode)`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
