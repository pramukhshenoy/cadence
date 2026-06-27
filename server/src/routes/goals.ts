import { Router, Request, Response, NextFunction } from 'express';
import { Priority, GoalStatus, TaskStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeProgress(
  tasks: { status: string; updatedAt: Date }[],
): { totalTasks: number; doneTasks: number; progressPercent: number; velocityCount: number } {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  // Velocity: tasks with DONE status whose updatedAt is within the last 7 days.
  // updatedAt is a proxy for completion date — it can overcount if a DONE task is edited later,
  // but this is rare in practice for a personal app.
  const velocityCount = tasks.filter(
    (t) => t.status === TaskStatus.DONE && t.updatedAt >= sevenDaysAgo,
  ).length;
  return { totalTasks, doneTasks, progressPercent, velocityCount };
}

async function fetchGoalProgress(
  goalId: string,
): Promise<{ totalTasks: number; doneTasks: number; progressPercent: number; velocityCount: number }> {
  const tasks = await prisma.task.findMany({
    where: { goalId },
    select: { status: true, updatedAt: true },
  });
  return computeProgress(tasks);
}

// ─── GET /api/goals ───────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.goal.findMany({
      include: { tasks: { select: { status: true, updatedAt: true } } },
      orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }, { createdAt: 'desc' }],
    });

    const result = goals.map(({ tasks, ...goal }) => ({
      ...goal,
      ...computeProgress(tasks),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/goals ──────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, priority, status, targetDate, linkedHabitId } = (req.body ?? {}) as {
      title: unknown;
      description: unknown;
      priority: unknown;
      status: unknown;
      targetDate: unknown;
      linkedHabitId: unknown;
    };

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    if (!priority || !Object.values(Priority).includes(priority as Priority)) {
      res.status(400).json({ error: `priority is required and must be one of: ${Object.values(Priority).join(', ')}` });
      return;
    }
    if (status !== undefined && !Object.values(GoalStatus).includes(status as GoalStatus)) {
      res.status(400).json({ error: `status must be one of: ${Object.values(GoalStatus).join(', ')}` });
      return;
    }

    let parsedTargetDate: Date | null = null;
    if (typeof targetDate === 'string') {
      parsedTargetDate = new Date(targetDate);
      if (isNaN(parsedTargetDate.getTime())) {
        res.status(400).json({ error: 'targetDate must be a valid ISO date string' });
        return;
      }
    }

    const goal = await prisma.goal.create({
      data: {
        title: (title as string).trim(),
        description: typeof description === 'string' ? description : null,
        priority: priority as Priority,
        status: (status as GoalStatus | undefined) ?? GoalStatus.ACTIVE,
        targetDate: parsedTargetDate,
        linkedHabitId: typeof linkedHabitId === 'string' ? linkedHabitId : null,
      },
    });

    res.status(201).json({ ...goal, totalTasks: 0, doneTasks: 0, progressPercent: 0, velocityCount: 0 });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/goals/:id ─────────────────────────────────────────────────────

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, targetDate, linkedHabitId } = (req.body ?? {}) as {
      title: unknown;
      description: unknown;
      priority: unknown;
      status: unknown;
      targetDate: unknown;
      linkedHabitId: unknown;
    };

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      res.status(400).json({ error: 'title must be a non-empty string' });
      return;
    }
    if (priority !== undefined && !Object.values(Priority).includes(priority as Priority)) {
      res.status(400).json({ error: `priority must be one of: ${Object.values(Priority).join(', ')}` });
      return;
    }
    if (status !== undefined && !Object.values(GoalStatus).includes(status as GoalStatus)) {
      res.status(400).json({ error: `status must be one of: ${Object.values(GoalStatus).join(', ')}` });
      return;
    }

    const data: Prisma.GoalUpdateInput = {};
    if (title !== undefined) data.title = (title as string).trim();
    if (description !== undefined) data.description = typeof description === 'string' ? description : null;
    if (priority !== undefined) data.priority = priority as Priority;
    if (status !== undefined) data.status = status as GoalStatus;
    if (targetDate !== undefined) {
      if (typeof targetDate === 'string') {
        const parsed = new Date(targetDate);
        if (isNaN(parsed.getTime())) {
          res.status(400).json({ error: 'targetDate must be a valid ISO date string' });
          return;
        }
        data.targetDate = parsed;
      } else if (targetDate === null) {
        data.targetDate = null;
      } else {
        res.status(400).json({ error: 'targetDate must be an ISO date string or null' });
        return;
      }
    }
    if (linkedHabitId !== undefined) {
      data.linkedHabitId = typeof linkedHabitId === 'string' ? linkedHabitId : null;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const goal = await prisma.goal.update({ where: { id }, data });
    const progress = await fetchGoalProgress(id);
    res.json({ ...goal, ...progress });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    next(err);
  }
});

// ─── DELETE /api/goals/:id ────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Nullify child task goalIds and delete the goal atomically
    await prisma.$transaction([
      prisma.task.updateMany({ where: { goalId: id }, data: { goalId: null } }),
      prisma.goal.delete({ where: { id } }),
    ]);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    next(err);
  }
});

export default router;
