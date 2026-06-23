import express from 'express';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';
import { timezoneMiddleware } from './middleware/timezone';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

if (!process.env.API_BEARER_TOKEN) {
  throw new Error('API_BEARER_TOKEN env var is required');
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(timezoneMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(authMiddleware);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

export default app;
