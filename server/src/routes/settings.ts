import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getSettings } from '../lib/settings';
import { isValidModelId } from '../lib/models';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getSettings(prisma);
    res.json({
      preferredModel: settings.preferredModel,
      targetCalendarId: settings.targetCalendarId,
      sleepThresholdHours: settings.sleepThresholdHours,
      goodThresholdHours: settings.goodThresholdHours,
      morningCutoffHour: settings.morningCutoffHour,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { preferredModel, targetCalendarId, sleepThresholdHours, goodThresholdHours, morningCutoffHour } = body;

    if (
      preferredModel === undefined &&
      targetCalendarId === undefined &&
      sleepThresholdHours === undefined &&
      goodThresholdHours === undefined &&
      morningCutoffHour === undefined
    ) {
      res.status(400).json({ error: 'At least one setting field is required' });
      return;
    }

    const update: {
      preferredModel?: string;
      targetCalendarId?: string | null;
      sleepThresholdHours?: number;
      goodThresholdHours?: number;
      morningCutoffHour?: number;
    } = {};

    if (preferredModel !== undefined) {
      if (typeof preferredModel !== 'string' || !preferredModel.trim()) {
        res.status(400).json({ error: 'preferredModel must be a non-empty string' });
        return;
      }
      const trimmed = preferredModel.trim();
      if (!isValidModelId(trimmed)) {
        res.status(400).json({ error: 'preferredModel must be a valid Claude or GPT model ID' });
        return;
      }
      update.preferredModel = trimmed;
    }

    if (targetCalendarId !== undefined) {
      if (targetCalendarId !== null && typeof targetCalendarId !== 'string') {
        res.status(400).json({ error: 'targetCalendarId must be a string or null' });
        return;
      }
      update.targetCalendarId = targetCalendarId as string | null;
    }

    if (sleepThresholdHours !== undefined) {
      if (typeof sleepThresholdHours !== 'number' || !Number.isFinite(sleepThresholdHours) || sleepThresholdHours <= 0) {
        res.status(400).json({ error: 'sleepThresholdHours must be a positive number' });
        return;
      }
      update.sleepThresholdHours = sleepThresholdHours;
    }

    if (goodThresholdHours !== undefined) {
      if (typeof goodThresholdHours !== 'number' || !Number.isFinite(goodThresholdHours) || goodThresholdHours <= 0) {
        res.status(400).json({ error: 'goodThresholdHours must be a positive number' });
        return;
      }
      update.goodThresholdHours = goodThresholdHours;
    }

    // Cross-field: sleepThresholdHours must be strictly less than goodThresholdHours.
    // When only one is in the request, fetch the persisted value for the other.
    if (update.sleepThresholdHours !== undefined || update.goodThresholdHours !== undefined) {
      const needCurrentSleep = update.sleepThresholdHours === undefined;
      const needCurrentGood = update.goodThresholdHours === undefined;
      let effectiveSleep = update.sleepThresholdHours;
      let effectiveGood = update.goodThresholdHours;
      if (needCurrentSleep || needCurrentGood) {
        const current = await getSettings(prisma);
        if (needCurrentSleep) effectiveSleep = current.sleepThresholdHours;
        if (needCurrentGood) effectiveGood = current.goodThresholdHours;
      }
      if ((effectiveSleep as number) >= (effectiveGood as number)) {
        res.status(400).json({ error: 'sleepThresholdHours must be less than goodThresholdHours' });
        return;
      }
    }

    if (morningCutoffHour !== undefined) {
      if (typeof morningCutoffHour !== 'number' || !Number.isInteger(morningCutoffHour) || morningCutoffHour < 0 || morningCutoffHour > 23) {
        res.status(400).json({ error: 'morningCutoffHour must be an integer between 0 and 23' });
        return;
      }
      update.morningCutoffHour = morningCutoffHour;
    }

    const updated = await prisma.settings.upsert({
      where: { id: 'singleton' },
      update,
      create: { id: 'singleton', ...update },
    });

    res.json({
      preferredModel: updated.preferredModel,
      targetCalendarId: updated.targetCalendarId,
      sleepThresholdHours: updated.sleepThresholdHours,
      goodThresholdHours: updated.goodThresholdHours,
      morningCutoffHour: updated.morningCutoffHour,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
