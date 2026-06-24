import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../app';
import prisma from '../lib/prisma';
import { calcDailyStreak, calcWeeklyStreak } from '../routes/habits';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    habit: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    habitCompletion: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

const AUTH = 'Bearer test-token';
const TZ_HEADER = { 'X-Timezone': 'UTC' };
// Fixed "today" for tests that hit API routes involving todayLocalDate()
const FIXED_TODAY = '2026-06-23';

const mockHabit = {
  id: 'habit1',
  name: 'Morning run',
  description: null,
  frequency: 'DAILY',
  weeklyTargetDays: null,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
};

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${FIXED_TODAY}T12:00:00Z`));
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── calcDailyStreak unit tests ───────────────────────────────────────────────

describe('calcDailyStreak', () => {
  const today = '2026-06-23';

  it('returns 0 for no completions', () => {
    expect(calcDailyStreak([], today)).toBe(0);
  });

  it('returns 1 when only today is completed', () => {
    expect(calcDailyStreak([today], today)).toBe(1);
  });

  it('returns 1 when only yesterday is completed (streak alive, not yet done today)', () => {
    expect(calcDailyStreak(['2026-06-22'], today)).toBe(1);
  });

  it('returns 0 when last completion was 2+ days ago', () => {
    expect(calcDailyStreak(['2026-06-21'], today)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(calcDailyStreak(['2026-06-21', '2026-06-22', today], today)).toBe(3);
  });

  it('counts consecutive days ending yesterday when today is missing', () => {
    expect(calcDailyStreak(['2026-06-20', '2026-06-21', '2026-06-22'], today)).toBe(3);
  });

  it('stops at a gap even if earlier dates exist', () => {
    // gap on 2026-06-22
    expect(calcDailyStreak(['2026-06-20', '2026-06-21', today], today)).toBe(1);
  });

  it('handles a long streak', () => {
    const dates = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - i);
      return d.toISOString().slice(0, 10);
    });
    expect(calcDailyStreak(dates, today)).toBe(10);
  });
});

// ─── calcWeeklyStreak unit tests ──────────────────────────────────────────────

describe('calcWeeklyStreak', () => {
  // 2026-06-23 is a Tuesday; week starts 2026-06-22 (Mon)
  const today = '2026-06-23';
  const target = 2;

  it('returns 0 for no completions', () => {
    expect(calcWeeklyStreak([], target, today)).toBe(0);
  });

  it('returns 1 when current week has met target', () => {
    expect(calcWeeklyStreak(['2026-06-22', '2026-06-23'], target, today)).toBe(1);
  });

  it('returns 1 when current week not yet met but last week did (streak alive)', () => {
    // only 1 completion this week (< target=2), but 2 completions last week
    expect(calcWeeklyStreak(['2026-06-15', '2026-06-16', '2026-06-23'], target, today)).toBe(1);
  });

  it('returns 0 when current week not met and last week not met', () => {
    expect(calcWeeklyStreak(['2026-06-23'], target, today)).toBe(0);
  });

  it('counts consecutive weeks where target is met', () => {
    const dates = [
      // current week: 2 completions
      '2026-06-22',
      '2026-06-23',
      // prev week: 2 completions
      '2026-06-15',
      '2026-06-16',
      // 2 weeks ago: 2 completions
      '2026-06-08',
      '2026-06-09',
    ];
    expect(calcWeeklyStreak(dates, target, today)).toBe(3);
  });

  it('stops when a week in the chain does not meet target', () => {
    const dates = [
      // current week: 2 completions
      '2026-06-22',
      '2026-06-23',
      // prev week: only 1 (gap)
      '2026-06-15',
      // 2 weeks ago: 2 completions (ignored due to gap)
      '2026-06-08',
      '2026-06-09',
    ];
    expect(calcWeeklyStreak(dates, target, today)).toBe(1);
  });

  it('respects targetCount of 1', () => {
    expect(calcWeeklyStreak(['2026-06-22'], 1, today)).toBe(1);
  });
});

// ─── GET /api/habits ──────────────────────────────────────────────────────────

describe('GET /api/habits', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/habits');
    expect(res.status).toBe(401);
  });

  it('returns habit list with completedToday=false and streak=0 when no completions', async () => {
    (prisma.habit.findMany as jest.Mock).mockResolvedValue([
      { ...mockHabit, completions: [] },
    ]);
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].completedToday).toBe(false);
    expect(res.body[0].streak).toBe(0);
    expect(res.body[0].completions).toBeUndefined();
  });

  it('returns completedToday=true when today is in completions', async () => {
    (prisma.habit.findMany as jest.Mock).mockResolvedValue([
      { ...mockHabit, completions: [{ id: 'c1', habitId: 'habit1', localDate: FIXED_TODAY }] },
    ]);
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(200);
    expect(res.body[0].completedToday).toBe(true);
    expect(res.body[0].streak).toBe(1);
  });

  it('does not expose raw completions array in response', async () => {
    (prisma.habit.findMany as jest.Mock).mockResolvedValue([
      { ...mockHabit, completions: [] },
    ]);
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.body[0]).not.toHaveProperty('completions');
  });

  it('computes streak for WEEKLY habit', async () => {
    const weeklyHabit = {
      ...mockHabit,
      id: 'habit2',
      frequency: 'WEEKLY',
      weeklyTargetDays: '[1,3]', // target count = 2
      completions: [
        { id: 'c1', habitId: 'habit2', localDate: '2026-06-22' },
        { id: 'c2', habitId: 'habit2', localDate: '2026-06-23' },
      ],
    };
    (prisma.habit.findMany as jest.Mock).mockResolvedValue([weeklyHabit]);
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(200);
    expect(res.body[0].streak).toBe(1);
  });
});

// ─── POST /api/habits ─────────────────────────────────────────────────────────

describe('POST /api/habits', () => {
  it('creates a DAILY habit', async () => {
    (prisma.habit.create as jest.Mock).mockResolvedValue(mockHabit);
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: 'Morning run', frequency: 'DAILY' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockHabit);
    expect(prisma.habit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Morning run', frequency: 'DAILY', weeklyTargetDays: null }),
      }),
    );
  });

  it('trims whitespace from name', async () => {
    (prisma.habit.create as jest.Mock).mockResolvedValue(mockHabit);
    await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: '  Morning run  ', frequency: 'DAILY' });
    expect(prisma.habit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Morning run' }) }),
    );
  });

  it('creates a WEEKLY habit with weeklyTargetDays serialized to JSON string', async () => {
    const weeklyHabit = { ...mockHabit, frequency: 'WEEKLY', weeklyTargetDays: '[1,3,5]' };
    (prisma.habit.create as jest.Mock).mockResolvedValue(weeklyHabit);
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: 'Gym', frequency: 'WEEKLY', weeklyTargetDays: [1, 3, 5] });
    expect(res.status).toBe(201);
    expect(prisma.habit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ weeklyTargetDays: '[1,3,5]' }),
      }),
    );
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ frequency: 'DAILY' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is blank', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: '   ', frequency: 'DAILY' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when frequency is missing', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: 'Run' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid frequency', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: 'Run', frequency: 'MONTHLY' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for WEEKLY without weeklyTargetDays', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: 'Gym', frequency: 'WEEKLY' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for WEEKLY with empty weeklyTargetDays array', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', AUTH)
      .send({ name: 'Gym', frequency: 'WEEKLY', weeklyTargetDays: [] });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/habits/:id ────────────────────────────────────────────────────

describe('PATCH /api/habits/:id', () => {
  it('updates a habit name', async () => {
    const updated = { ...mockHabit, name: 'Evening run' };
    (prisma.habit.update as jest.Mock).mockResolvedValue(updated);
    const res = await request(app)
      .patch('/api/habits/habit1')
      .set('Authorization', AUTH)
      .send({ name: 'Evening run' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Evening run');
    expect(prisma.habit.update).toHaveBeenCalledWith({
      where: { id: 'habit1' },
      data: { name: 'Evening run' },
    });
  });

  it('returns 404 for non-existent habit', async () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '0',
    });
    (prisma.habit.update as jest.Mock).mockRejectedValue(notFound);
    const res = await request(app)
      .patch('/api/habits/nope')
      .set('Authorization', AUTH)
      .send({ name: 'Run' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid frequency', async () => {
    const res = await request(app)
      .patch('/api/habits/habit1')
      .set('Authorization', AUTH)
      .send({ frequency: 'MONTHLY' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for blank name', async () => {
    const res = await request(app)
      .patch('/api/habits/habit1')
      .set('Authorization', AUTH)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .patch('/api/habits/habit1')
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  it('serializes weeklyTargetDays array to JSON string', async () => {
    (prisma.habit.update as jest.Mock).mockResolvedValue({ ...mockHabit, weeklyTargetDays: '[1,3]' });
    await request(app)
      .patch('/api/habits/habit1')
      .set('Authorization', AUTH)
      .send({ weeklyTargetDays: [1, 3] });
    expect(prisma.habit.update).toHaveBeenCalledWith({
      where: { id: 'habit1' },
      data: { weeklyTargetDays: '[1,3]' },
    });
  });

  it('sets weeklyTargetDays to null when passed null', async () => {
    (prisma.habit.update as jest.Mock).mockResolvedValue({ ...mockHabit, weeklyTargetDays: null });
    await request(app)
      .patch('/api/habits/habit1')
      .set('Authorization', AUTH)
      .send({ weeklyTargetDays: null });
    expect(prisma.habit.update).toHaveBeenCalledWith({
      where: { id: 'habit1' },
      data: { weeklyTargetDays: null },
    });
  });
});

// ─── DELETE /api/habits/:id ───────────────────────────────────────────────────

describe('DELETE /api/habits/:id', () => {
  it('deletes a habit and returns 204', async () => {
    (prisma.habit.delete as jest.Mock).mockResolvedValue(mockHabit);
    const res = await request(app)
      .delete('/api/habits/habit1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(204);
    expect(prisma.habit.delete).toHaveBeenCalledWith({ where: { id: 'habit1' } });
  });

  it('returns 404 for non-existent habit', async () => {
    const notFound = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '0',
    });
    (prisma.habit.delete as jest.Mock).mockRejectedValue(notFound);
    const res = await request(app)
      .delete('/api/habits/nope')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/habits/habit1');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/habits/:id/complete ────────────────────────────────────────────

describe('POST /api/habits/:id/complete', () => {
  const mockCompletion = { id: 'comp1', habitId: 'habit1', localDate: FIXED_TODAY };

  it('logs completion for today and returns it', async () => {
    (prisma.habit.findUnique as jest.Mock).mockResolvedValue(mockHabit);
    (prisma.habitCompletion.upsert as jest.Mock).mockResolvedValue(mockCompletion);
    const res = await request(app)
      .post('/api/habits/habit1/complete')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockCompletion);
    expect(prisma.habitCompletion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { habitId_localDate: { habitId: 'habit1', localDate: FIXED_TODAY } },
        create: { habitId: 'habit1', localDate: FIXED_TODAY },
      }),
    );
  });

  it('is idempotent — returns existing completion if already completed today', async () => {
    (prisma.habit.findUnique as jest.Mock).mockResolvedValue(mockHabit);
    (prisma.habitCompletion.upsert as jest.Mock).mockResolvedValue(mockCompletion);
    // Call twice
    await request(app)
      .post('/api/habits/habit1/complete')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    const res = await request(app)
      .post('/api/habits/habit1/complete')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(200);
  });

  it('returns 404 when habit does not exist', async () => {
    (prisma.habit.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post('/api/habits/nope/complete')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(404);
    expect(prisma.habitCompletion.upsert).not.toHaveBeenCalled();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/habits/habit1/complete');
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/habits/:id/complete ──────────────────────────────────────────

describe('DELETE /api/habits/:id/complete', () => {
  it('removes today\'s completion and returns 204', async () => {
    (prisma.habit.findUnique as jest.Mock).mockResolvedValue(mockHabit);
    (prisma.habitCompletion.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await request(app)
      .delete('/api/habits/habit1/complete')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(204);
    expect(prisma.habitCompletion.deleteMany).toHaveBeenCalledWith({
      where: { habitId: 'habit1', localDate: FIXED_TODAY },
    });
  });

  it('is idempotent — returns 204 even when no completion existed', async () => {
    (prisma.habit.findUnique as jest.Mock).mockResolvedValue(mockHabit);
    (prisma.habitCompletion.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    const res = await request(app)
      .delete('/api/habits/habit1/complete')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(204);
  });

  it('returns 404 when habit does not exist', async () => {
    (prisma.habit.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/habits/nope/complete')
      .set('Authorization', AUTH)
      .set(TZ_HEADER);
    expect(res.status).toBe(404);
    expect(prisma.habitCompletion.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/habits/habit1/complete');
    expect(res.status).toBe(401);
  });
});
