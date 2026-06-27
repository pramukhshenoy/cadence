import { getSettings } from '../lib/settings';
import type { PrismaClient } from '@prisma/client';

const mockSettings = {
  id: 'singleton',
  preferredModel: 'claude-sonnet-4-6',
  focusHoursPerWeek: 10,
  workdayStartHour: 9,
  workdayEndHour: 18,
  includeWeekends: false,
  sleepThresholdHours: 6.5,
  goodThresholdHours: 7.0,
  morningCutoffHour: 10,
  targetCalendarId: null,
  timezone: 'UTC',
  updatedAt: new Date(),
};

function makePrisma(overrides: Partial<{
  findUnique: jest.Mock;
  upsert: jest.Mock;
}>): Pick<PrismaClient, 'settings'> {
  return {
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      ...overrides,
    },
  } as unknown as Pick<PrismaClient, 'settings'>;
}

describe('getSettings', () => {
  it('returns existing settings when the singleton row exists', async () => {
    const prisma = makePrisma({
      findUnique: jest.fn().mockResolvedValue(mockSettings),
    });
    const result = await getSettings(prisma as unknown as PrismaClient);
    expect(result).toEqual(mockSettings);
    expect(prisma.settings.upsert).not.toHaveBeenCalled();
  });

  it('upserts and returns defaults when the singleton row is missing', async () => {
    const prisma = makePrisma({
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(mockSettings),
    });
    const result = await getSettings(prisma as unknown as PrismaClient);
    expect(result).toEqual(mockSettings);
    expect(prisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'singleton' },
        update: {},
        create: { id: 'singleton' },
      }),
    );
  });
});
