import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../app';
import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    task: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    goal: {
      findUnique: jest.fn(),
    },
  },
}));

const AUTH = 'Bearer test-token';

const mockTask = {
  id: 'cuid1',
  title: 'Test task',
  description: null,
  priority: 'HIGH',
  dueDate: null,
  status: 'TODO',
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/tasks ──────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('returns task list', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
    const res = await request(app).get('/api/tasks').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([mockTask]);
  });

  it('passes status filter to prisma', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    await request(app).get('/api/tasks?status=DONE').set('Authorization', AUTH);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'DONE' } }),
    );
  });

  it('passes priority filter to prisma', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    await request(app).get('/api/tasks?priority=HIGH').set('Authorization', AUTH);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { priority: 'HIGH' } }),
    );
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .get('/api/tasks?status=INVALID')
      .set('Authorization', AUTH);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .get('/api/tasks?priority=CRITICAL')
      .set('Authorization', AUTH);
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/tasks ─────────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  it('creates a task with valid data', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test task', priority: 'HIGH' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockTask);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Test task', priority: 'HIGH', status: 'TODO' }),
      }),
    );
  });

  it('trims whitespace from title', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);
    await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: '  Test task  ', priority: 'LOW' });
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Test task' }),
      }),
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ priority: 'HIGH' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is blank', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: '   ', priority: 'HIGH' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when priority is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test', priority: 'CRITICAL' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test', priority: 'HIGH', status: 'FINISHED' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid dueDate string', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test', priority: 'HIGH', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('accepts a valid ISO dueDate string', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue({ ...mockTask, dueDate: '2026-06-24T00:00:00.000Z' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test', priority: 'HIGH', dueDate: '2026-06-24' });
    expect(res.status).toBe(201);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dueDate: new Date('2026-06-24') }),
      }),
    );
  });

  it('silently ignores dueDate when not a string (non-null, non-string)', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test', priority: 'HIGH', dueDate: 42 });
    // Server currently accepts this and stores dueDate as null; document that behaviour
    expect(res.status).toBe(201);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dueDate: null }),
      }),
    );
  });

  it('accepts an explicit status', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue({ ...mockTask, status: 'IN_PROGRESS' });
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Test', priority: 'MEDIUM', status: 'IN_PROGRESS' });
    expect(res.status).toBe(201);
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      }),
    );
  });
});

// ─── PATCH /api/tasks/:id ────────────────────────────────────────────────────

describe('PATCH /api/tasks/:id', () => {
  it('updates a task', async () => {
    const updated = { ...mockTask, status: 'DONE' };
    (prisma.task.update as jest.Mock).mockResolvedValue(updated);
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ status: 'DONE' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DONE');
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'cuid1' },
      data: { status: 'DONE' },
    });
  });

  it('returns 404 for non-existent task', async () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '0',
    });
    (prisma.task.update as jest.Mock).mockRejectedValue(notFound);
    const res = await request(app)
      .patch('/api/tasks/nope')
      .set('Authorization', AUTH)
      .send({ status: 'DONE' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ priority: 'CRITICAL' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ status: 'FINISHED' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is blank', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid dueDate string', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ dueDate: 'garbage' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-string non-null dueDate', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ dueDate: 42 });
    expect(res.status).toBe(400);
  });

  it('accepts a valid dueDate string', async () => {
    const updated = { ...mockTask, dueDate: '2026-06-26T00:00:00.000Z' };
    (prisma.task.update as jest.Mock).mockResolvedValue(updated);
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ dueDate: '2026-06-26' });
    expect(res.status).toBe(200);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'cuid1' },
      data: { dueDate: new Date('2026-06-26') },
    });
  });

  it('accepts null dueDate to clear the field', async () => {
    (prisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, dueDate: null });
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ dueDate: null });
    expect(res.status).toBe(200);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'cuid1' },
      data: { dueDate: null },
    });
  });

  it('returns 400 when body has no recognised fields', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ unknownField: 'value' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  it('only sends provided fields to prisma', async () => {
    (prisma.task.update as jest.Mock).mockResolvedValue(mockTask);
    await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ title: 'New title' });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'cuid1' },
      data: { title: 'New title' },
    });
  });
});

// ─── DELETE /api/tasks/:id ───────────────────────────────────────────────────

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task and returns 204', async () => {
    (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);
    const res = await request(app)
      .delete('/api/tasks/cuid1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(204);
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'cuid1' } });
  });

  it('returns 404 for non-existent task', async () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '0',
    });
    (prisma.task.delete as jest.Mock).mockRejectedValue(notFound);
    const res = await request(app)
      .delete('/api/tasks/nope')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/tasks/cuid1');
    expect(res.status).toBe(401);
  });
});

// ─── goalId support ──────────────────────────────────────────────────────────

describe('GET /api/tasks — goalId filter', () => {
  it('passes goalId filter to prisma', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    await request(app).get('/api/tasks?goalId=goal1').set('Authorization', AUTH);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { goalId: 'goal1' } }),
    );
  });

  it('converts goalId=null string to null filter', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    await request(app).get('/api/tasks?goalId=null').set('Authorization', AUTH);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { goalId: null } }),
    );
  });
});

describe('PATCH /api/tasks/:id — goalId field', () => {
  it('connects task to an existing goal', async () => {
    (prisma.goal.findUnique as jest.Mock).mockResolvedValue({ id: 'goal1' });
    (prisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, goalId: 'goal1' });
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ goalId: 'goal1' });
    expect(res.status).toBe(200);
    expect(prisma.goal.findUnique).toHaveBeenCalledWith({ where: { id: 'goal1' }, select: { id: true } });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'cuid1' },
      data: { goal: { connect: { id: 'goal1' } } },
    });
  });

  it('returns 400 when goal does not exist', async () => {
    (prisma.goal.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ goalId: 'missing-goal' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Goal not found/);
  });

  it('disconnects goal when goalId is null', async () => {
    (prisma.task.update as jest.Mock).mockResolvedValue({ ...mockTask, goalId: null });
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ goalId: null });
    expect(res.status).toBe(200);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'cuid1' },
      data: { goal: { disconnect: true } },
    });
  });

  it('returns 400 for non-string non-null goalId', async () => {
    const res = await request(app)
      .patch('/api/tasks/cuid1')
      .set('Authorization', AUTH)
      .send({ goalId: 42 });
    expect(res.status).toBe(400);
  });
});
