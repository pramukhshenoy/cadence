import express from 'express';
import { authMiddleware } from './middleware/auth';
import { timezoneMiddleware } from './middleware/timezone';
import { errorHandler } from './middleware/errorHandler';
import tasksRouter from './routes/tasks';
import habitsRouter from './routes/habits';
import chatRouter from './routes/chat';
import settingsRouter from './routes/settings';
import calendarRouter from './routes/calendar';
import focusBlocksRouter from './routes/focus-blocks';
import sleepRouter from './routes/sleep';
import goalsRouter from './routes/goals';

const app = express();
app.use(express.json());
app.use(timezoneMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(authMiddleware);
app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/focus-blocks', focusBlocksRouter);
app.use('/api/sleep', sleepRouter);
app.use('/api/goals', goalsRouter);
app.use(errorHandler);

export default app;
