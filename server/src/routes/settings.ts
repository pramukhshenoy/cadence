import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { getSettings } from '../lib/settings';
import { isValidModelId } from '../lib/models';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getSettings(prisma);
    res.json({ preferredModel: settings.preferredModel });
  } catch (err) {
    next(err);
  }
});

router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { preferredModel } = (req.body ?? {}) as { preferredModel: unknown };

    if (preferredModel === undefined) {
      res.status(400).json({ error: 'preferredModel is required' });
      return;
    }
    if (typeof preferredModel !== 'string' || !preferredModel.trim()) {
      res.status(400).json({ error: 'preferredModel must be a non-empty string' });
      return;
    }
    const trimmed = preferredModel.trim();
    if (!isValidModelId(trimmed)) {
      res.status(400).json({ error: 'preferredModel must be a valid Claude or GPT model ID' });
      return;
    }

    const updated = await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: { preferredModel: trimmed },
      create: { id: 'singleton', preferredModel: trimmed },
    });
    res.json({ preferredModel: updated.preferredModel });
  } catch (err) {
    next(err);
  }
});

export default router;
