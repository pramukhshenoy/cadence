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
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { preferredModel, targetCalendarId } = body;

    if (preferredModel === undefined && targetCalendarId === undefined) {
      res.status(400).json({ error: 'At least one of preferredModel or targetCalendarId is required' });
      return;
    }

    const update: { preferredModel?: string; targetCalendarId?: string | null } = {};

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

    const updated = await prisma.settings.upsert({
      where: { id: 'singleton' },
      update,
      create: { id: 'singleton', ...update },
    });

    res.json({
      preferredModel: updated.preferredModel,
      targetCalendarId: updated.targetCalendarId,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
