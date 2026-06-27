import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../app';
import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    goal: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const AUTH = 'Bearer test-token';

const mockGoal = {
  id: 'goal1',
  title: 'Learn Spanish',
  description: null,
  priority: 'HIGH',
  status: 'ACTIVE',
  targetDate: null,
  linkedHabitId: null,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
};

// Default progress mock: no tasks (used by PATCH which calls fetchGoalProgress via task.findMany)
function mockZeroProgress() {
  (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/goals ──────────────────────────────────────────────────────────

const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);   // 30 days ago

describe('GET /api/goals', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(401);
  });

  it('returns goals list with computed progress fields', async () => {
    (prisma.goal.findMany as jest.Mock).mockResolvedValue([{
      ...mockGoal,
      tasks: [
        { status: 'DONE', updatedAt: recentDate },
        { status: 'DONE', updatedAt: recentDate },
        { status: 'TODO', updatedAt: recentDate },
        { status: 'TODO', updatedAt: recentDate },
        { status: 'TODO', updatedAt: recentDate },
      ],
    }]);

    const res = await request(app).get('/api/goals').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 'goal1',
      title: 'Learn Spanish',
      totalTasks: 5,
      doneTasks: 2,
      progressPercent: 40,
      velocityCount: 2,
    });
    // tasks array should not be included in the response
    expect(res.body[0].tasks).toBeUndefined();
  });

  it('returns empty list when no goals exist', async () => {
    (prisma.goal.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/goals').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns progressPercent 0 when goal has no tasks', async () => {
    (prisma.goal.findMany as jest.Mock).mockResolvedValue([{ ...mockGoal, tasks: [] }]);
    const res = await request(app).get('/api/goals').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].progressPercent).toBe(0);
    expect(res.body[0].velocityCount).toBe(0);
  });

  it('does not count old DONE tasks toward velocity', async () => {
    (prisma.goal.findMany as jest.Mock).mockResolvedValue([{
      ...mockGoal,
      tasks: [
        { status: 'DONE', updatedAt: recentDate },
        { status: 'DONE', updatedAt: oldDate },
      ],
    }]);
    const res = await request(app).get('/api/goals').set('Authorization', AUTH);
    expect(res.body[0].doneTasks).toBe(2);
    expect(res.body[0].velocityCount).toBe(1); // only the recent one
  });
});

// ─── POST /api/goals ─────────────────────────────────────────────────────────

describe('POST /api/goals', () => {
  it('creates a goal with required fields', async () => {
    (prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal);
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'goal1',
      title: 'Learn Spanish',
      totalTasks: 0,
      doneTasks: 0,
      progressPercent: 0,
      velocityCount: 0,
    });
    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Learn Spanish', priority: 'HIGH', status: 'ACTIVE' }),
      }),
    );
  });

  it('trims whitespace from title', async () => {
    (prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal);
    await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: '  Learn Spanish  ', priority: 'HIGH' });
    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Learn Spanish' }),
      }),
    );
  });

  it('accepts optional fields', async () => {
    const goalWithDate = { ...mockGoal, description: 'A goal', targetDate: '2026-12-31T00:00:00.000Z' };
    (prisma.goal.create as jest.Mock).mockResolvedValue(goalWithDate);
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH', description: 'A goal', targetDate: '2026-12-31' });
    expect(res.status).toBe(201);
    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: 'A goal',
          targetDate: new Date('2026-12-31'),
        }),
      }),
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ priority: 'HIGH' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is blank', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: '   ', priority: 'HIGH' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when priority is missing', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'CRITICAL' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH', status: 'PAUSED' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid targetDate string', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH', targetDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('accepts an explicit status', async () => {
    const completed = { ...mockGoal, status: 'COMPLETED' };
    (prisma.goal.create as jest.Mock).mockResolvedValue(completed);
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH', status: 'COMPLETED' });
    expect(res.status).toBe(201);
    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });
});

// ─── PATCH /api/goals/:id ────────────────────────────────────────────────────

describe('PATCH /api/goals/:id', () => {
  it('updates a goal and returns it with progress', async () => {
    const updated = { ...mockGoal, title: 'Learn French' };
    (prisma.goal.update as jest.Mock).mockResolvedValue(updated);
    mockZeroProgress();

    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ title: 'Learn French' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Learn French');
    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal1' },
      data: { title: 'Learn French' },
    });
  });

  it('can update status to COMPLETED', async () => {
    (prisma.goal.update as jest.Mock).mockResolvedValue({ ...mockGoal, status: 'COMPLETED' });
    mockZeroProgress();

    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
  });

  it('returns 404 for non-existent goal', async () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '0',
    });
    (prisma.goal.update as jest.Mock).mockRejectedValue(notFound);
    const res = await request(app)
      .patch('/api/goals/nope')
      .set('Authorization', AUTH)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ priority: 'CRITICAL' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ status: 'PAUSED' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is blank', async () => {
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid targetDate string', async () => {
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ targetDate: 'garbage' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-string non-null targetDate', async () => {
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ targetDate: 42 });
    expect(res.status).toBe(400);
  });

  it('accepts null targetDate to clear the field', async () => {
    (prisma.goal.update as jest.Mock).mockResolvedValue({ ...mockGoal, targetDate: null });
    mockZeroProgress();

    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ targetDate: null });
    expect(res.status).toBe(200);
    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal1' },
      data: { targetDate: null },
    });
  });

  it('accepts a valid ISO targetDate string and stores it as a Date', async () => {
    const updated = { ...mockGoal, targetDate: new Date('2026-12-31T00:00:00.000Z') };
    (prisma.goal.update as jest.Mock).mockResolvedValue(updated);
    mockZeroProgress();

    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ targetDate: '2026-12-31' });
    expect(res.status).toBe(200);
    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal1' },
      data: { targetDate: new Date('2026-12-31') },
    });
  });

  it('returns 400 when body has no recognised fields', async () => {
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ unknownField: 'value' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/goals/:id ───────────────────────────────────────────────────

describe('DELETE /api/goals/:id', () => {
  it('nullifies child task goalIds and deletes goal in a transaction', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
    (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.goal.delete as jest.Mock).mockResolvedValue(mockGoal);

    const res = await request(app)
      .delete('/api/goals/goal1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(204);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { goalId: 'goal1' },
      data: { goalId: null },
    });
    expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: 'goal1' } });
  });

  it('returns 404 for non-existent goal', async () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '0',
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(notFound);

    const res = await request(app)
      .delete('/api/goals/nope')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/goals/goal1');
    expect(res.status).toBe(401);
  });
});

// ─── linkedHabitId field ─────────────────────────────────────────────────────

describe('POST /api/goals — linkedHabitId', () => {
  it('stores linkedHabitId when provided as a string', async () => {
    const goalWithHabit = { ...mockGoal, linkedHabitId: 'habit1' };
    (prisma.goal.create as jest.Mock).mockResolvedValue(goalWithHabit);
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH', linkedHabitId: 'habit1' });
    expect(res.status).toBe(201);
    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ linkedHabitId: 'habit1' }),
      }),
    );
  });

  it('stores null when linkedHabitId is not a string', async () => {
    (prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal);
    await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH', linkedHabitId: 42 });
    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ linkedHabitId: null }),
      }),
    );
  });
});

describe('PATCH /api/goals/:id — linkedHabitId', () => {
  it('updates linkedHabitId when provided', async () => {
    const updated = { ...mockGoal, linkedHabitId: 'habit2' };
    (prisma.goal.update as jest.Mock).mockResolvedValue(updated);
    mockZeroProgress();

    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ linkedHabitId: 'habit2' });
    expect(res.status).toBe(200);
    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal1' },
      data: { linkedHabitId: 'habit2' },
    });
  });

  it('sets linkedHabitId to null when a non-string is passed', async () => {
    (prisma.goal.update as jest.Mock).mockResolvedValue({ ...mockGoal, linkedHabitId: null });
    mockZeroProgress();

    await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ linkedHabitId: null });
    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal1' },
      data: { linkedHabitId: null },
    });
  });
});

// ─── Error propagation (catch paths) ─────────────────────────────────────────

describe('GET /api/goals — error propagation', () => {
  it('returns 500 when prisma.goal.findMany throws', async () => {
    (prisma.goal.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await request(app).get('/api/goals').set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/goals — error propagation', () => {
  it('returns 500 when prisma.goal.create throws', async () => {
    (prisma.goal.create as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', AUTH)
      .send({ title: 'Learn Spanish', priority: 'HIGH' });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/goals/:id — error propagation', () => {
  it('returns 500 when prisma.goal.update throws unexpected error', async () => {
    (prisma.goal.update as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .patch('/api/goals/goal1')
      .set('Authorization', AUTH)
      .send({ title: 'Test' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/goals/:id — error propagation', () => {
  it('returns 500 when transaction throws unexpected error', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .delete('/api/goals/goal1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});
