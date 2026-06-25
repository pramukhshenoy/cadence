import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import * as settingsLib from '../lib/settings';
import { computeReschedule } from '../lib/sleep-reschedule';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    sleepRecord: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    focusBlock: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../lib/settings', () => ({
  getSettings: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTH = { Authorization: 'Bearer test-token' };
const TZ = { 'X-Timezone': 'UTC' };
const HEADERS = { ...AUTH, ...TZ };

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

const mockSleepRecord = {
  id: 'sleep-1',
  localDate: '2026-06-25',
  durationHours: 5.5,
  quality: 'POOR',
  deepSleepHours: 1.2,
  remSleepHours: 0.8,
  sessionCount: 1,
  fetchedAt: new Date('2026-06-25T07:00:00Z'),
  updatedAt: new Date('2026-06-25T07:00:00Z'),
};

// A morning focus block at 09:00–10:00 UTC (which is 09:00–10:00 local in UTC tz)
const mockMorningBlock = {
  id: 'block-morning-1',
  deviceCalendarEventId: 'cal-1',
  calendarMarker: 'marker-1',
  startTime: new Date('2026-06-25T09:00:00Z'),
  endTime: new Date('2026-06-25T10:00:00Z'),
  taskId: null,
  status: 'ACTIVE',
  rescheduled: false,
  rescheduleReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// An afternoon focus block at 14:00–15:00 UTC
const mockAfternoonBlock = {
  id: 'block-afternoon-1',
  deviceCalendarEventId: 'cal-2',
  calendarMarker: 'marker-2',
  startTime: new Date('2026-06-25T14:00:00Z'),
  endTime: new Date('2026-06-25T15:00:00Z'),
  taskId: null,
  status: 'ACTIVE',
  rescheduled: false,
  rescheduleReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (settingsLib.getSettings as jest.Mock).mockResolvedValue(mockSettings);
  (prisma.sleepRecord.upsert as jest.Mock).mockResolvedValue(mockSleepRecord);
  (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.focusBlock.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
});

// ─── POST /api/sleep ──────────────────────────────────────────────────────────

describe('POST /api/sleep', () => {
  const validBody = {
    localDate: '2026-06-25',
    durationHours: 7.5,
    quality: 'GOOD',
    deepSleepHours: 1.5,
    remSleepHours: 1.0,
    sessionCount: 1,
  };

  it('persists sleep record and returns 201', async () => {
    (prisma.sleepRecord.upsert as jest.Mock).mockResolvedValue({ ...mockSleepRecord, quality: 'GOOD', durationHours: 7.5 });
    const res = await request(app).post('/api/sleep').set(HEADERS).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.sleepRecord.localDate).toBe('2026-06-25');
    expect(prisma.sleepRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { localDate: '2026-06-25' } }),
    );
  });

  it('upserts — second POST for same localDate overwrites', async () => {
    await request(app).post('/api/sleep').set(HEADERS).send(validBody);
    await request(app).post('/api/sleep').set(HEADERS).send({ ...validBody, durationHours: 8.0 });
    expect(prisma.sleepRecord.upsert).toHaveBeenCalledTimes(2);
  });

  it('returns performed: false for GOOD quality (no reschedule)', async () => {
    const res = await request(app).post('/api/sleep').set(HEADERS).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.reschedule.performed).toBe(false);
    expect(res.body.reschedule.blocksToDelete).toEqual([]);
    expect(prisma.focusBlock.findMany).not.toHaveBeenCalled();
  });

  it('returns performed: false for FAIR quality (no reschedule)', async () => {
    const res = await request(app).post('/api/sleep').set(HEADERS).send({ ...validBody, quality: 'FAIR', durationHours: 6.8 });
    expect(res.status).toBe(201);
    expect(res.body.reschedule.performed).toBe(false);
  });

  it('returns performed: true for POOR quality with morning blocks to move', async () => {
    (prisma.sleepRecord.upsert as jest.Mock).mockResolvedValue(mockSleepRecord);
    (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([mockMorningBlock]);
    const res = await request(app)
      .post('/api/sleep')
      .set(HEADERS)
      .send({ localDate: '2026-06-25', durationHours: 5.5, quality: 'POOR' });
    expect(res.status).toBe(201);
    expect(res.body.reschedule.performed).toBe(true);
    expect(res.body.reschedule.blocksToDelete).toContain('block-morning-1');
    expect(res.body.reschedule.newBlocks.length).toBeGreaterThan(0);
  });

  it('returns performed: true with no blocks to move when no morning blocks exist', async () => {
    (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app)
      .post('/api/sleep')
      .set(HEADERS)
      .send({ localDate: '2026-06-25', durationHours: 5.0, quality: 'POOR' });
    expect(res.status).toBe(201);
    expect(res.body.reschedule.performed).toBe(true);
    expect(res.body.reschedule.blocksToDelete).toEqual([]);
    expect(res.body.reschedule.newBlocks).toEqual([]);
  });

  it('afternoon blocks are excluded from blocksToDelete', async () => {
    (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([mockMorningBlock, mockAfternoonBlock]);
    const res = await request(app)
      .post('/api/sleep')
      .set(HEADERS)
      .send({ localDate: '2026-06-25', durationHours: 5.5, quality: 'POOR' });
    expect(res.status).toBe(201);
    expect(res.body.reschedule.blocksToDelete).not.toContain('block-afternoon-1');
  });

  it('accepts null for deepSleepHours and remSleepHours', async () => {
    const res = await request(app)
      .post('/api/sleep')
      .set(HEADERS)
      .send({ localDate: '2026-06-25', durationHours: 7.5, quality: 'GOOD', deepSleepHours: null, remSleepHours: null });
    expect(res.status).toBe(201);
  });

  it('accepts null for sessionCount (treated as default 1)', async () => {
    const res = await request(app)
      .post('/api/sleep')
      .set(HEADERS)
      .send({ localDate: '2026-06-25', durationHours: 7.5, quality: 'GOOD', sessionCount: null });
    expect(res.status).toBe(201);
  });

  it('stamps morning blocks as rescheduled=true in DB when POOR quality', async () => {
    (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([mockMorningBlock]);
    await request(app)
      .post('/api/sleep')
      .set(HEADERS)
      .send({ localDate: '2026-06-25', durationHours: 5.5, quality: 'POOR' });
    expect(prisma.focusBlock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['block-morning-1'] } },
        data: expect.objectContaining({ rescheduled: true }),
      }),
    );
  });

  it('returns 400 for missing localDate', async () => {
    const res = await request(app).post('/api/sleep').set(HEADERS).send({ durationHours: 7.5, quality: 'GOOD' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid localDate format', async () => {
    const res = await request(app).post('/api/sleep').set(HEADERS).send({ localDate: '25-06-2026', durationHours: 7.5, quality: 'GOOD' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative durationHours', async () => {
    const res = await request(app).post('/api/sleep').set(HEADERS).send({ localDate: '2026-06-25', durationHours: -1, quality: 'GOOD' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid quality value', async () => {
    const res = await request(app).post('/api/sleep').set(HEADERS).send({ localDate: '2026-06-25', durationHours: 7.5, quality: 'AMAZING' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer sessionCount', async () => {
    const res = await request(app).post('/api/sleep').set(HEADERS).send({ localDate: '2026-06-25', durationHours: 7.5, quality: 'GOOD', sessionCount: 1.5 });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth header', async () => {
    const res = await request(app).post('/api/sleep').set(TZ).send(validBody);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/sleep/latest ────────────────────────────────────────────────────

describe('GET /api/sleep/latest', () => {
  it('returns the most recent sleep record', async () => {
    (prisma.sleepRecord.findFirst as jest.Mock).mockResolvedValue(mockSleepRecord);
    const res = await request(app).get('/api/sleep/latest').set(HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.sleepRecord.localDate).toBe('2026-06-25');
  });

  it('returns null when no records exist', async () => {
    (prisma.sleepRecord.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/api/sleep/latest').set(HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.sleepRecord).toBeNull();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/sleep/latest');
    expect(res.status).toBe(401);
  });
});

// ─── computeReschedule unit tests ─────────────────────────────────────────────

describe('computeReschedule', () => {
  // All times in UTC. Settings morningCutoffHour=10, workdayStart=9, workdayEnd=18.
  // todayStr = '2026-06-25', tomorrowStr = '2026-06-26', timezone = 'UTC'
  // "now" at 08:00 UTC so we're before the cutoff.
  const baseInput = {
    busySlots: [],
    settings: { morningCutoffHour: 10, workdayStartHour: 9, workdayEndHour: 18 },
    timezone: 'UTC',
    todayStr: '2026-06-25',
    tomorrowStr: '2026-06-26',
    now: new Date('2026-06-25T08:00:00Z'),
  };

  it('returns empty result when no morning blocks', () => {
    const result = computeReschedule({ ...baseInput, morningBlocks: [] });
    expect(result.blocksToDelete).toEqual([]);
    expect(result.newBlocks).toEqual([]);
    expect(result.droppedCount).toBe(0);
  });

  it('moves a single morning block to afternoon today', () => {
    const morningBlocks = [{
      id: 'b1',
      startTime: new Date('2026-06-25T09:00:00Z'),
      endTime: new Date('2026-06-25T10:00:00Z'),
    }];
    const result = computeReschedule({ ...baseInput, morningBlocks });
    expect(result.blocksToDelete).toEqual(['b1']);
    expect(result.newBlocks).toHaveLength(1);
    expect(result.newBlocks[0].startTime).toBe('2026-06-25T10:00:00.000Z'); // afternoonStart
    expect(result.droppedCount).toBe(0);
  });

  it('skips past time when now is after morningCutoffHour', () => {
    const now = new Date('2026-06-25T13:00:00Z'); // 1pm — afternoon already started
    const morningBlocks = [{
      id: 'b1',
      startTime: new Date('2026-06-25T09:00:00Z'),
      endTime: new Date('2026-06-25T10:00:00Z'),
    }];
    const result = computeReschedule({ ...baseInput, morningBlocks, now });
    expect(result.newBlocks[0].startTime).toBe('2026-06-25T13:00:00.000Z');
  });

  it('moves multiple morning blocks, avoids existing afternoon busy slots', () => {
    const morningBlocks = [
      { id: 'b1', startTime: new Date('2026-06-25T09:00:00Z'), endTime: new Date('2026-06-25T10:00:00Z') },
      { id: 'b2', startTime: new Date('2026-06-25T09:30:00Z'), endTime: new Date('2026-06-25T10:00:00Z') },
    ];
    // Busy from 11:00–12:00 UTC
    const busySlots = [{ startTime: new Date('2026-06-25T11:00:00Z'), endTime: new Date('2026-06-25T12:00:00Z') }];
    const result = computeReschedule({ ...baseInput, morningBlocks, busySlots });
    expect(result.blocksToDelete).toEqual(['b1', 'b2']);
    // Shouldn't schedule anything in the busy window
    for (const nb of result.newBlocks) {
      const start = new Date(nb.startTime).getTime();
      const end = new Date(nb.endTime).getTime();
      expect(start >= new Date('2026-06-25T12:00:00Z').getTime() ||
             end <= new Date('2026-06-25T11:00:00Z').getTime()).toBe(true);
    }
  });

  it('falls back to tomorrow morning when afternoon today is full', () => {
    const morningBlocks = [
      { id: 'b1', startTime: new Date('2026-06-25T09:00:00Z'), endTime: new Date('2026-06-25T10:00:00Z') },
    ];
    // Fill entire afternoon with a busy slot
    const busySlots = [{
      startTime: new Date('2026-06-25T10:00:00Z'),
      endTime: new Date('2026-06-25T18:00:00Z'),
    }];
    const result = computeReschedule({ ...baseInput, morningBlocks, busySlots });
    expect(result.blocksToDelete).toEqual(['b1']);
    // Must fall back to tomorrow
    const tomorrowBlocks = result.newBlocks.filter((b) => b.startTime.startsWith('2026-06-26'));
    expect(tomorrowBlocks.length).toBeGreaterThan(0);
  });

  it('drops blocks when both afternoon today and tomorrow morning are full', () => {
    const morningBlocks = [
      { id: 'b1', startTime: new Date('2026-06-25T09:00:00Z'), endTime: new Date('2026-06-25T10:00:00Z') },
    ];
    // Fill all available windows
    const busySlots = [
      { startTime: new Date('2026-06-25T10:00:00Z'), endTime: new Date('2026-06-25T18:00:00Z') },
      { startTime: new Date('2026-06-26T09:00:00Z'), endTime: new Date('2026-06-26T10:00:00Z') },
    ];
    const result = computeReschedule({ ...baseInput, morningBlocks, busySlots });
    expect(result.newBlocks).toHaveLength(0);
    expect(result.droppedCount).toBe(1);
  });

  it('new blocks each have a unique calendarMarker UUID', () => {
    const morningBlocks = [
      { id: 'b1', startTime: new Date('2026-06-25T09:00:00Z'), endTime: new Date('2026-06-25T10:00:00Z') },
      { id: 'b2', startTime: new Date('2026-06-25T08:00:00Z'), endTime: new Date('2026-06-25T09:00:00Z') },
    ];
    const result = computeReschedule({ ...baseInput, morningBlocks });
    const markers = result.newBlocks.map((b) => b.calendarMarker);
    const unique = new Set(markers);
    expect(unique.size).toBe(markers.length);
  });

  it('new blocks all have title "Focus Block"', () => {
    const morningBlocks = [
      { id: 'b1', startTime: new Date('2026-06-25T09:00:00Z'), endTime: new Date('2026-06-25T10:00:00Z') },
    ];
    const result = computeReschedule({ ...baseInput, morningBlocks });
    for (const b of result.newBlocks) {
      expect(b.title).toBe('Focus Block');
    }
  });
});
