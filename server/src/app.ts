import express from 'express';
import { authMiddleware } from './middleware/auth';
import { timezoneMiddleware } from './middleware/timezone';
import { errorHandler } from './middleware/errorHandler';
import tasksRouter from './routes/tasks';
import habitsRouter from './routes/habits';

const app = express();
app.use(express.json());
app.use(timezoneMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(authMiddleware);
app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);
app.use(errorHandler);

export default app;
