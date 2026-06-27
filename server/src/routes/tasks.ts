import { Router, Request, Response, NextFunction } from 'express';
import { Priority, TaskStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, goalId } = req.query;

    const where: { status?: TaskStatus; priority?: Priority; goalId?: string | null } = {};
    if (status !== undefined) {
      if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
        res.status(400).json({ error: `Invalid status: must be one of ${Object.values(TaskStatus).join(', ')}` });
        return;
      }
      where.status = status as TaskStatus;
    }
    if (priority !== undefined) {
      if (!Object.values(Priority).includes(priority as Priority)) {
        res.status(400).json({ error: `Invalid priority: must be one of ${Object.values(Priority).join(', ')}` });
        return;
      }
      where.priority = priority as Priority;
    }
    if (goalId !== undefined) {
      where.goalId = goalId === 'null' ? null : (goalId as string);
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, priority, dueDate, status } = (req.body ?? {}) as {
      title: unknown;
      description: unknown;
      priority: unknown;
      dueDate: unknown;
      status: unknown;
    };

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    if (!priority || !Object.values(Priority).includes(priority as Priority)) {
      res.status(400).json({ error: `priority is required and must be one of: ${Object.values(Priority).join(', ')}` });
      return;
    }
    if (status !== undefined && !Object.values(TaskStatus).includes(status as TaskStatus)) {
      res.status(400).json({ error: `status must be one of: ${Object.values(TaskStatus).join(', ')}` });
      return;
    }

    let parsedDueDate: Date | null = null;
    if (typeof dueDate === 'string') {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        res.status(400).json({ error: 'dueDate must be a valid ISO date string' });
        return;
      }
    }

    const task = await prisma.task.create({
      data: {
        title: (title as string).trim(),
        description: typeof description === 'string' ? description : null,
        priority: priority as Priority,
        dueDate: parsedDueDate,
        status: (status as TaskStatus | undefined) ?? TaskStatus.TODO,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, status, goalId } = (req.body ?? {}) as {
      title: unknown;
      description: unknown;
      priority: unknown;
      dueDate: unknown;
      status: unknown;
      goalId: unknown;
    };

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      res.status(400).json({ error: 'title must be a non-empty string' });
      return;
    }
    if (priority !== undefined && !Object.values(Priority).includes(priority as Priority)) {
      res.status(400).json({ error: `priority must be one of: ${Object.values(Priority).join(', ')}` });
      return;
    }
    if (status !== undefined && !Object.values(TaskStatus).includes(status as TaskStatus)) {
      res.status(400).json({ error: `status must be one of: ${Object.values(TaskStatus).join(', ')}` });
      return;
    }

    const data: Prisma.TaskUpdateInput = {};
    if (title !== undefined) data.title = (title as string).trim();
    if (description !== undefined) data.description = typeof description === 'string' ? description : null;
    if (priority !== undefined) data.priority = priority as Priority;
    if (dueDate !== undefined) {
      if (typeof dueDate === 'string') {
        const parsed = new Date(dueDate);
        if (isNaN(parsed.getTime())) {
          res.status(400).json({ error: 'dueDate must be a valid ISO date string' });
          return;
        }
        data.dueDate = parsed;
      } else if (dueDate === null) {
        data.dueDate = null;
      } else {
        res.status(400).json({ error: 'dueDate must be an ISO date string or null' });
        return;
      }
    }
    if (status !== undefined) data.status = status as TaskStatus;
    if (goalId !== undefined) {
      if (goalId === null) {
        data.goal = { disconnect: true };
      } else if (typeof goalId === 'string') {
        const goalExists = await prisma.goal.findUnique({ where: { id: goalId }, select: { id: true } });
        if (!goalExists) {
          res.status(400).json({ error: 'Goal not found' });
          return;
        }
        data.goal = { connect: { id: goalId } };
      } else {
        res.status(400).json({ error: 'goalId must be a string or null' });
        return;
      }
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    const task = await prisma.task.update({ where: { id }, data });
    res.json(task);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    next(err);
  }
});

export default router;
