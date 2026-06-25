import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getSettings } from '../lib/settings';
import { getIsoWeekDates, localTimeToUtc } from '../lib/scheduler';

const router = Router();

type BlockInput = {
  deviceCalendarEventId: string;
  calendarMarker: string;
  startTime: string;
  endTime: string;
};

// GET /api/focus-blocks/week-summary — scheduled vs elapsed hours for the current ISO week
router.get('/week-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tz = req.timezone;
    const now = new Date();

    const weekDates = getIsoWeekDates(now, tz);
    const weekStart = localTimeToUtc(weekDates[0], 0, 0, tz);

    // Next Monday = Sunday + 1 day = exclusive week end
    const [sy, sm, sd] = weekDates[6].split('-').map(Number);
    const nextMondayStr = new Date(Date.UTC(sy, sm - 1, sd + 1)).toISOString().slice(0, 10);
    const weekEnd = localTimeToUtc(nextMondayStr, 0, 0, tz);

    const [settings, blocks] = await Promise.all([
      getSettings(prisma),
      prisma.focusBlock.findMany({
        where: {
          status: 'ACTIVE',
          startTime: { gte: weekStart, lt: weekEnd },
        },
      }),
    ]);
    const targetHours = settings.focusHoursPerWeek;

    let scheduledMinutes = 0;
    let elapsedMinutes = 0;

    for (const block of blocks) {
      const durationMin = (block.endTime.getTime() - block.startTime.getTime()) / 60000;
      scheduledMinutes += durationMin;
      if (block.endTime <= now) {
        elapsedMinutes += durationMin;
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const scheduledHours = round2(scheduledMinutes / 60);
    const elapsedHours = round2(elapsedMinutes / 60);
    const shortfallHours = round2(Math.max(0, targetHours - scheduledHours));

    res.json({ scheduledHours, elapsedHours, targetHours, shortfallHours });
  } catch (err) {
    next(err);
  }
});

// GET /api/focus-blocks — returns ACTIVE focus blocks with startTime >= now
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blocks = await prisma.focusBlock.findMany({
      where: {
        status: 'ACTIVE',
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json({ blocks });
  } catch (err) {
    next(err);
  }
});

// POST /api/focus-blocks/batch — persist multiple focus block records written to device calendar
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (!Array.isArray(body.blocks)) {
      res.status(400).json({ error: 'blocks must be an array' });
      return;
    }

    const valid = (body.blocks as unknown[]).filter((b): b is BlockInput => {
      const block = b as Record<string, unknown>;
      return (
        typeof block === 'object' &&
        block !== null &&
        typeof block.deviceCalendarEventId === 'string' &&
        typeof block.calendarMarker === 'string' &&
        typeof block.startTime === 'string' &&
        typeof block.endTime === 'string' &&
        !isNaN(new Date(block.startTime as string).getTime()) &&
        !isNaN(new Date(block.endTime as string).getTime())
      );
    });

    if (valid.length === 0) {
      res.status(400).json({ error: 'No valid blocks provided' });
      return;
    }

    const result = await prisma.focusBlock.createMany({
      data: valid.map((b) => ({
        deviceCalendarEventId: b.deviceCalendarEventId,
        calendarMarker: b.calendarMarker,
        startTime: new Date(b.startTime),
        endTime: new Date(b.endTime),
      })),
    });

    res.status(201).json({ count: result.count });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/focus-blocks/batch-delete — mark multiple blocks DELETED by id
router.patch('/batch-delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (!Array.isArray(body.ids) || !(body.ids as unknown[]).every((id) => typeof id === 'string')) {
      res.status(400).json({ error: 'ids must be an array of strings' });
      return;
    }

    const result = await prisma.focusBlock.updateMany({
      where: { id: { in: body.ids as string[] } },
      data: { status: 'DELETED' },
    });

    res.json({ count: result.count });
  } catch (err) {
    next(err);
  }
});

export default router;
