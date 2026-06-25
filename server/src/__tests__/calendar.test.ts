import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { scheduleBlocks, localTimeToUtc } from '../lib/scheduler';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const AUTH = 'Bearer test-token';
const TZ_HEADER = 'UTC';

const mockSettings = {
  id: 'singleton',
  focusHoursPerWeek: 10,
  workdayStartHour: 9,
  workdayEndHour: 18,
  includeWeekends: false,
  preferredModel: 'claude-sonnet-4-6',
  sleepThresholdHours: 6.5,
  goodThresholdHours: 7.0,
  morningCutoffHour: 10,
  targetCalendarId: null,
  timezone: 'UTC',
  updatedAt: new Date('2026-01-01'),
};

// Verified dates for the week of June 15, 2026:
//   Mon=Jun 15, Tue=Jun 16, Wed=Jun 17, Thu=Jun 18, Fri=Jun 19, Sat=Jun 20, Sun=Jun 21
// Verification: Jan 1 2026 = Thursday (day 4). Jun 15 = day 166. (4 + 165) % 7 = 1 = Monday ✓
const MONDAY_MIDNIGHT = new Date('2026-06-15T00:00:00.000Z');

const UTC_SETTINGS = {
  focusHoursPerWeek: 2,
  workdayStartHour: 9,
  workdayEndHour: 18,
  includeWeekends: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.settings.findUnique as jest.Mock).mockResolvedValue(mockSettings);
});

// ─── localTimeToUtc ───────────────────────────────────────────────────────────

describe('localTimeToUtc', () => {
  it('returns correct UTC for UTC timezone', () => {
    const result = localTimeToUtc('2026-06-15', 9, 0, 'UTC');
    expect(result.toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  it('returns correct UTC for IST (UTC+5:30)', () => {
    // 9:00 IST = 3:30 UTC
    const result = localTimeToUtc('2026-06-15', 9, 0, 'Asia/Kolkata');
    expect(result.toISOString()).toBe('2026-06-15T03:30:00.000Z');
  });

  it('handles non-zero minutes', () => {
    const result = localTimeToUtc('2026-06-15', 18, 30, 'UTC');
    expect(result.toISOString()).toBe('2026-06-15T18:30:00.000Z');
  });
});

// ─── scheduleBlocks — core algorithm ─────────────────────────────────────────

describe('scheduleBlocks', () => {
  it('fills requested hours exactly with no events', () => {
    const result = scheduleBlocks({
      events: [],
      timezone: 'UTC',
      settings: UTC_SETTINGS,
      now: MONDAY_MIDNIGHT,
    });

    expect(result.scheduledHours).toBe(2);
    expect(result.requestedHours).toBe(2);
    expect(result.shortfallHours).toBe(0);
    expect(result.focusBlocks).toHaveLength(2);
    // Blocks start at workday start on Monday (now is midnight, before 09:00)
    expect(result.focusBlocks[0].startTime).toBe('2026-06-15T09:00:00.000Z');
    expect(result.focusBlocks[0].endTime).toBe('2026-06-15T10:00:00.000Z');
    expect(result.focusBlocks[1].startTime).toBe('2026-06-15T10:00:00.000Z');
    expect(result.focusBlocks[1].endTime).toBe('2026-06-15T11:00:00.000Z');
  });

  it('assigns unique calendarMarker UUIDs', () => {
    const result = scheduleBlocks({
      events: [],
      timezone: 'UTC',
      settings: { ...UTC_SETTINGS, focusHoursPerWeek: 3 },
      now: MONDAY_MIDNIGHT,
    });
    const markers = result.focusBlocks.map(b => b.calendarMarker);
    expect(new Set(markers).size).toBe(markers.length);
  });

  it('sets title to "Focus Block" on every block', () => {
    const result = scheduleBlocks({
      events: [],
      timezone: 'UTC',
      settings: UTC_SETTINGS,
      now: MONDAY_MIDNIGHT,
    });
    for (const block of result.focusBlocks) {
      expect(block.title).toBe('Focus Block');
    }
  });

  it('does not overlap with existing events', () => {
    const events = [
      // 3-hour morning meeting on Monday
      { startTime: '2026-06-15T09:00:00.000Z', endTime: '2026-06-15T12:00:00.000Z' },
    ];
    const result = scheduleBlocks({
      events,
      timezone: 'UTC',
      settings: UTC_SETTINGS,
      now: MONDAY_MIDNIGHT,
    });

    expect(result.focusBlocks).toHaveLength(2);
    for (const block of result.focusBlocks) {
      const bStart = new Date(block.startTime).getTime();
      const bEnd = new Date(block.endTime).getTime();
      const evStart = new Date('2026-06-15T09:00:00.000Z').getTime();
      const evEnd = new Date('2026-06-15T12:00:00.000Z').getTime();
      // Non-overlapping: block ends at or before event start, OR block starts at or after event end
      expect(bEnd <= evStart || bStart >= evEnd).toBe(true);
    }
    // First block starts immediately after the meeting
    expect(result.focusBlocks[0].startTime).toBe('2026-06-15T12:00:00.000Z');
  });

  it('handles an event that splits a gap into two parts', () => {
    const events = [
      // Lunch: 12:00–13:00 on Monday
      { startTime: '2026-06-15T12:00:00.000Z', endTime: '2026-06-15T13:00:00.000Z' },
    ];
    const result = scheduleBlocks({
      events,
      timezone: 'UTC',
      settings: UTC_SETTINGS,
      now: MONDAY_MIDNIGHT,
    });
    // Both blocks fit in the morning gap (before lunch)
    expect(result.focusBlocks[0].startTime).toBe('2026-06-15T09:00:00.000Z');
    expect(result.focusBlocks[1].startTime).toBe('2026-06-15T10:00:00.000Z');
    for (const block of result.focusBlocks) {
      const bStart = new Date(block.startTime).getTime();
      const bEnd = new Date(block.endTime).getTime();
      const lunchStart = new Date('2026-06-15T12:00:00.000Z').getTime();
      const lunchEnd = new Date('2026-06-15T13:00:00.000Z').getTime();
      expect(bEnd <= lunchStart || bStart >= lunchEnd).toBe(true);
    }
  });

  it('skips weekends when includeWeekends is false', () => {
    const result = scheduleBlocks({
      events: [],
      timezone: 'UTC',
      settings: { focusHoursPerWeek: 100, workdayStartHour: 9, workdayEndHour: 18, includeWeekends: false },
      now: MONDAY_MIDNIGHT,
    });
    for (const block of result.focusBlocks) {
      const dow = new Date(block.startTime).getUTCDay();
      expect(dow).not.toBe(0); // not Sunday
      expect(dow).not.toBe(6); // not Saturday
    }
    // Mon–Fri only: 5 days × 9 hrs = 45 hrs available
    expect(result.scheduledHours).toBe(45);
    expect(result.shortfallHours).toBe(55);
  });

  it('includes weekends when includeWeekends is true', () => {
    const result = scheduleBlocks({
      events: [],
      timezone: 'UTC',
      settings: { focusHoursPerWeek: 100, workdayStartHour: 9, workdayEndHour: 18, includeWeekends: true },
      now: MONDAY_MIDNIGHT,
    });
    const dows = new Set(result.focusBlocks.map(b => new Date(b.startTime).getUTCDay()));
    // Should have Sat (6) and Sun (0) blocks
    expect(dows.has(6)).toBe(true);
    expect(dows.has(0)).toBe(true);
    // 7 days × 9 hrs = 63 hrs available
    expect(result.scheduledHours).toBe(63);
  });

  it('reports shortfall when free time is less than requested hours', () => {
    // Block 10:00–18:00 Mon–Fri, leaving only 09:00–10:00 (1 hr/day) = 5 hrs total
    const events = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'].map(d => ({
      startTime: `${d}T10:00:00.000Z`,
      endTime: `${d}T18:00:00.000Z`,
    }));
    const result = scheduleBlocks({
      events,
      timezone: 'UTC',
      settings: { focusHoursPerWeek: 10, workdayStartHour: 9, workdayEndHour: 18, includeWeekends: false },
      now: MONDAY_MIDNIGHT,
    });
    expect(result.scheduledHours).toBe(5);
    expect(result.requestedHours).toBe(10);
    expect(result.shortfallHours).toBe(5);
  });

  it('schedules a block in a gap of exactly 30 minutes', () => {
    // Event 09:00–17:30 on Monday — remaining gap is exactly 30 min (17:30–18:00)
    const events = [
      { startTime: '2026-06-15T09:00:00.000Z', endTime: '2026-06-15T17:30:00.000Z' },
    ];
    const result = scheduleBlocks({
      events,
      timezone: 'UTC',
      settings: { focusHoursPerWeek: 0.5, workdayStartHour: 9, workdayEndHour: 18, includeWeekends: false },
      now: MONDAY_MIDNIGHT,
    });
    expect(result.focusBlocks).toHaveLength(1);
    expect(result.focusBlocks[0].startTime).toBe('2026-06-15T17:30:00.000Z');
    expect(result.focusBlocks[0].endTime).toBe('2026-06-15T18:00:00.000Z');
    expect(result.scheduledHours).toBe(0.5);
    expect(result.shortfallHours).toBe(0);
  });

  it('skips gaps smaller than 30 minutes and schedules on the next eligible day', () => {
    // Event 09:00–17:35 on Monday — remaining gap is only 25 min (below minimum)
    const events = [
      { startTime: '2026-06-15T09:00:00.000Z', endTime: '2026-06-15T17:35:00.000Z' },
    ];
    const result = scheduleBlocks({
      events,
      timezone: 'UTC',
      settings: { focusHoursPerWeek: 0.5, workdayStartHour: 9, workdayEndHour: 18, includeWeekends: false },
      now: MONDAY_MIDNIGHT,
    });
    expect(result.focusBlocks).toHaveLength(1);
    // Block must NOT be on Monday (25-min gap skipped), falls on Tuesday
    expect(result.focusBlocks[0].startTime.slice(0, 10)).toBe('2026-06-16');
  });

  it('returns zero blocks and full shortfall when no time is available', () => {
    // Block the entire workday Mon–Fri
    const events = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'].map(d => ({
      startTime: `${d}T09:00:00.000Z`,
      endTime: `${d}T18:00:00.000Z`,
    }));
    const result = scheduleBlocks({
      events,
      timezone: 'UTC',
      settings: { focusHoursPerWeek: 5, workdayStartHour: 9, workdayEndHour: 18, includeWeekends: false },
      now: MONDAY_MIDNIGHT,
    });
    expect(result.focusBlocks).toHaveLength(0);
    expect(result.scheduledHours).toBe(0);
    expect(result.shortfallHours).toBe(5);
  });

  it('skips past days in the current week', () => {
    // now = Wednesday Jun 17; Mon and Tue should be excluded
    const WEDNESDAY = new Date('2026-06-17T00:00:00.000Z');
    const result = scheduleBlocks({
      events: [],
      timezone: 'UTC',
      settings: { focusHoursPerWeek: 1, workdayStartHour: 9, workdayEndHour: 18, includeWeekends: false },
      now: WEDNESDAY,
    });
    expect(result.focusBlocks[0].startTime.slice(0, 10)).toBe('2026-06-17');
  });

  it('ignores malformed events gracefully', () => {
    const events = [
      { startTime: 'not-a-date', endTime: '2026-06-15T10:00:00.000Z' },
      { startTime: '2026-06-15T12:00:00.000Z', endTime: '2026-06-15T11:00:00.000Z' }, // end before start
    ] as never;
    const result = scheduleBlocks({
      events,
      timezone: 'UTC',
      settings: UTC_SETTINGS,
      now: MONDAY_MIDNIGHT,
    });
    // Malformed events are ignored; blocks fill normally from 09:00
    expect(result.scheduledHours).toBe(2);
    expect(result.focusBlocks[0].startTime).toBe('2026-06-15T09:00:00.000Z');
  });
});

// ─── POST /api/calendar/sync — HTTP tests ────────────────────────────────────

describe('POST /api/calendar/sync', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/calendar/sync');
    expect(res.status).toBe(401);
  });

  it('returns 400 when events field is missing', async () => {
    const res = await request(app)
      .post('/api/calendar/sync')
      .set('Authorization', AUTH)
      .set('X-Timezone', TZ_HEADER)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/events/);
  });

  it('returns 400 when events is not an array', async () => {
    const res = await request(app)
      .post('/api/calendar/sync')
      .set('Authorization', AUTH)
      .set('X-Timezone', TZ_HEADER)
      .send({ events: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with correct response shape for empty events array', async () => {
    const res = await request(app)
      .post('/api/calendar/sync')
      .set('Authorization', AUTH)
      .set('X-Timezone', TZ_HEADER)
      .send({ events: [] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.focusBlocks)).toBe(true);
    expect(typeof res.body.scheduledHours).toBe('number');
    expect(typeof res.body.requestedHours).toBe('number');
    expect(typeof res.body.shortfallHours).toBe('number');
    expect(res.body.requestedHours).toBe(mockSettings.focusHoursPerWeek);
  });

  it('filters out malformed event entries silently', async () => {
    const res = await request(app)
      .post('/api/calendar/sync')
      .set('Authorization', AUTH)
      .set('X-Timezone', TZ_HEADER)
      .send({
        events: [
          { startTime: '2026-06-15T09:00:00.000Z', endTime: '2026-06-15T10:00:00.000Z' },
          { foo: 'bar' },
          null,
          42,
        ],
      });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.focusBlocks)).toBe(true);
  });

  it('each focus block in response has calendarMarker, startTime, endTime, title', async () => {
    const res = await request(app)
      .post('/api/calendar/sync')
      .set('Authorization', AUTH)
      .set('X-Timezone', TZ_HEADER)
      .send({ events: [] });
    expect(res.status).toBe(200);
    for (const block of res.body.focusBlocks) {
      expect(typeof block.calendarMarker).toBe('string');
      expect(typeof block.startTime).toBe('string');
      expect(typeof block.endTime).toBe('string');
      expect(block.title).toBe('Focus Block');
    }
  });
});
