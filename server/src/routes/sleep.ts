import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getSettings } from '../lib/settings';
import { computeReschedule } from '../lib/sleep-reschedule';
import { utcToLocalDateStr, utcToLocalHour } from '../lib/scheduler';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tz = req.timezone;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { localDate, durationHours, quality, deepSleepHours, remSleepHours, sessionCount } = body;

    if (typeof localDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      res.status(400).json({ error: 'localDate must be a YYYY-MM-DD string' });
      return;
    }
    if (typeof durationHours !== 'number' || !Number.isFinite(durationHours) || durationHours <= 0) {
      res.status(400).json({ error: 'durationHours must be a positive number' });
      return;
    }
    if (quality !== 'POOR' && quality !== 'FAIR' && quality !== 'GOOD') {
      res.status(400).json({ error: 'quality must be POOR, FAIR, or GOOD' });
      return;
    }
    if (deepSleepHours !== undefined && deepSleepHours !== null &&
        (typeof deepSleepHours !== 'number' || !Number.isFinite(deepSleepHours))) {
      res.status(400).json({ error: 'deepSleepHours must be a number or null' });
      return;
    }
    if (remSleepHours !== undefined && remSleepHours !== null &&
        (typeof remSleepHours !== 'number' || !Number.isFinite(remSleepHours))) {
      res.status(400).json({ error: 'remSleepHours must be a number or null' });
      return;
    }
    // null treated as "omit" (same as deepSleepHours / remSleepHours) — defaults to 1
    if (sessionCount !== undefined && sessionCount !== null &&
        (typeof sessionCount !== 'number' || !Number.isInteger(sessionCount) || sessionCount < 1)) {
      res.status(400).json({ error: 'sessionCount must be a positive integer' });
      return;
    }

    const sleepRecord = await prisma.sleepRecord.upsert({
      where: { localDate: localDate as string },
      update: {
        durationHours: durationHours as number,
        quality: quality as 'POOR' | 'FAIR' | 'GOOD',
        deepSleepHours: (deepSleepHours as number | null | undefined) ?? null,
        remSleepHours: (remSleepHours as number | null | undefined) ?? null,
        sessionCount: (sessionCount as number | null | undefined) ?? 1,
      },
      create: {
        localDate: localDate as string,
        durationHours: durationHours as number,
        quality: quality as 'POOR' | 'FAIR' | 'GOOD',
        deepSleepHours: (deepSleepHours as number | null | undefined) ?? null,
        remSleepHours: (remSleepHours as number | null | undefined) ?? null,
        sessionCount: (sessionCount as number | null | undefined) ?? 1,
      },
    });

    if (quality !== 'POOR') {
      res.status(201).json({
        sleepRecord,
        reschedule: { performed: false, blocksToDelete: [], newBlocks: [], droppedCount: 0 },
      });
      return;
    }

    const [settings, activeBlocks] = await Promise.all([
      getSettings(prisma),
      prisma.focusBlock.findMany({ where: { status: 'ACTIVE' } }),
    ]);

    const now = new Date();
    const todayStr = utcToLocalDateStr(now, tz);

    // JS Date handles month/year rollover via day overflow (Date.UTC(y, m-1, 32) normalises correctly)
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const tomorrowStr = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().slice(0, 10);

    // Skip already-rescheduled blocks so a retry returns an empty plan rather than stale IDs
    const morningBlocks = activeBlocks.filter((b) => {
      return !b.rescheduled &&
             utcToLocalDateStr(b.startTime, tz) === todayStr &&
             utcToLocalHour(b.startTime, tz) < settings.morningCutoffHour;
    });

    // Stamp intent before returning so a client crash leaves a recoverable signal in the DB
    if (morningBlocks.length > 0) {
      await prisma.focusBlock.updateMany({
        where: { id: { in: morningBlocks.map((b) => b.id) } },
        data: { rescheduled: true, rescheduleReason: `poor sleep (${durationHours as number}h)` },
      });
    }

    const morningIds = new Set(morningBlocks.map((b) => b.id));
    const busySlots = activeBlocks
      .filter((b) => !morningIds.has(b.id))
      .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

    const reschedule = computeReschedule({
      morningBlocks,
      busySlots,
      settings: {
        morningCutoffHour: settings.morningCutoffHour,
        workdayStartHour: settings.workdayStartHour,
        workdayEndHour: settings.workdayEndHour,
      },
      timezone: tz,
      todayStr,
      tomorrowStr,
      now,
    });

    res.status(201).json({
      sleepRecord,
      reschedule: { performed: true, ...reschedule },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/latest', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await prisma.sleepRecord.findFirst({
      orderBy: { localDate: 'desc' },
    });
    res.json({ sleepRecord: record ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
