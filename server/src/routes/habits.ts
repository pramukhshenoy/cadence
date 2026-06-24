import { Router, Request, Response, NextFunction } from 'express';
import { Frequency, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

const router = Router();

function todayLocalDate(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1; // Monday-anchored ISO week
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

// Exported for unit testing
export function calcDailyStreak(completionDates: string[], today: string): number {
  const dateSet = new Set(completionDates);
  // If completed today, anchor at today; else check if yesterday keeps streak alive
  const anchor = dateSet.has(today) ? today : addDays(today, -1);
  if (!dateSet.has(anchor)) return 0;
  let streak = 0;
  let cur = anchor;
  while (dateSet.has(cur)) {
    streak++;
    cur = addDays(cur, -1);
  }
  return streak;
}

// Exported for unit testing
export function calcWeeklyStreak(completionDates: string[], targetCount: number, today: string): number {
  const weekCounts = new Map<string, number>();
  for (const d of completionDates) {
    const ws = isoWeekStart(d);
    weekCounts.set(ws, (weekCounts.get(ws) ?? 0) + 1);
  }
  const currentWeek = isoWeekStart(today);
  // If current week already met target, start there; otherwise fall back to previous week
  const anchor =
    (weekCounts.get(currentWeek) ?? 0) >= targetCount ? currentWeek : addDays(currentWeek, -7);
  if ((weekCounts.get(anchor) ?? 0) < targetCount) return 0;
  let streak = 0;
  let ws = anchor;
  while ((weekCounts.get(ws) ?? 0) >= targetCount) {
    streak++;
    ws = addDays(ws, -7);
  }
  return streak;
}

function weeklyTargetCount(weeklyTargetDays: string | null): number {
  if (!weeklyTargetDays) return 1;
  try {
    const parsed = JSON.parse(weeklyTargetDays) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.length;
  } catch {
    // ignore malformed stored value
  }
  return 1;
}

// ─── GET /api/habits ──────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = todayLocalDate(req.timezone);
    const habits = await prisma.habit.findMany({
      include: { completions: true },
      orderBy: { createdAt: 'asc' },
    });

    const result = habits.map((habit) => {
      const dates = habit.completions.map((c) => c.localDate);
      const completedToday = dates.includes(today);
      const streak =
        habit.frequency === Frequency.DAILY
          ? calcDailyStreak(dates, today)
          : calcWeeklyStreak(dates, weeklyTargetCount(habit.weeklyTargetDays), today);
      const { completions: _c, ...habitData } = habit;
      return { ...habitData, completedToday, streak };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/habits ─────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, frequency, weeklyTargetDays } = (req.body ?? {}) as {
      name: unknown;
      description: unknown;
      frequency: unknown;
      weeklyTargetDays: unknown;
    };

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (!frequency || !Object.values(Frequency).includes(frequency as Frequency)) {
      res.status(400).json({
        error: `frequency is required and must be one of: ${Object.values(Frequency).join(', ')}`,
      });
      return;
    }
    if (frequency === Frequency.WEEKLY) {
      if (!Array.isArray(weeklyTargetDays) || weeklyTargetDays.length === 0) {
        res
          .status(400)
          .json({ error: 'weeklyTargetDays must be a non-empty array of day integers (0=Sun) for WEEKLY habits' });
        return;
      }
    }

    const habit = await prisma.habit.create({
      data: {
        name: (name as string).trim(),
        description: typeof description === 'string' ? description : null,
        frequency: frequency as Frequency,
        weeklyTargetDays:
          frequency === Frequency.WEEKLY ? JSON.stringify(weeklyTargetDays) : null,
      },
    });
    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/habits/:id ────────────────────────────────────────────────────

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, frequency, weeklyTargetDays } = (req.body ?? {}) as {
      name: unknown;
      description: unknown;
      frequency: unknown;
      weeklyTargetDays: unknown;
    };

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({ error: 'name must be a non-empty string' });
      return;
    }
    if (frequency !== undefined && !Object.values(Frequency).includes(frequency as Frequency)) {
      res.status(400).json({ error: `frequency must be one of: ${Object.values(Frequency).join(', ')}` });
      return;
    }

    const data: Prisma.HabitUpdateInput = {};
    if (name !== undefined) data.name = (name as string).trim();
    if (description !== undefined) data.description = typeof description === 'string' ? description : null;
    if (frequency !== undefined) data.frequency = frequency as Frequency;
    if (weeklyTargetDays !== undefined) {
      data.weeklyTargetDays = Array.isArray(weeklyTargetDays)
        ? JSON.stringify(weeklyTargetDays)
        : null;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const habit = await prisma.habit.update({ where: { id }, data });
    res.json(habit);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    next(err);
  }
});

// ─── DELETE /api/habits/:id ───────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.habit.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    next(err);
  }
});

// ─── DELETE /api/habits/:id/complete ─────────────────────────────────────────

router.delete('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const today = todayLocalDate(req.timezone);

    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    await prisma.habitCompletion.deleteMany({
      where: { habitId: id, localDate: today },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/habits/:id/complete ────────────────────────────────────────────

router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const today = todayLocalDate(req.timezone);

    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    // Idempotent: upsert so re-completing today is safe
    const completion = await prisma.habitCompletion.upsert({
      where: { habitId_localDate: { habitId: id, localDate: today } },
      update: {},
      create: { habitId: id, localDate: today },
    });

    res.json(completion);
  } catch (err) {
    next(err);
  }
});

export default router;
