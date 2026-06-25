import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getSettings } from '../lib/settings';
import { scheduleBlocks, CalendarEvent } from '../lib/scheduler';

const router = Router();

router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (!Array.isArray(body.events)) {
      res.status(400).json({ error: 'events must be an array' });
      return;
    }

    const events: CalendarEvent[] = (body.events as unknown[]).filter(
      (e): e is CalendarEvent =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as Record<string, unknown>).startTime === 'string' &&
        typeof (e as Record<string, unknown>).endTime === 'string',
    );

    const settings = await getSettings(prisma);
    const result = scheduleBlocks({
      events,
      timezone: req.timezone,
      settings: {
        focusHoursPerWeek: settings.focusHoursPerWeek,
        workdayStartHour: settings.workdayStartHour,
        workdayEndHour: settings.workdayEndHour,
        includeWeekends: settings.includeWeekends,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
