import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import * as settingsLib from '../lib/settings';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
  (settingsLib.getSettings as jest.Mock).mockResolvedValue(mockSettings);
  (prisma.settings.upsert as jest.Mock).mockResolvedValue({ ...mockSettings });
});

// ─── GET /api/settings ────────────────────────────────────────────────────────

describe('GET /api/settings', () => {
  it('returns preferredModel and targetCalendarId from settings', async () => {
    const res = await request(app).get('/api/settings').set(HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.preferredModel).toBe('claude-sonnet-4-6');
    expect(res.body.targetCalendarId).toBeNull();
  });

  it('returns targetCalendarId when set', async () => {
    (settingsLib.getSettings as jest.Mock).mockResolvedValue({
      ...mockSettings,
      targetCalendarId: 'cal-123',
    });
    const res = await request(app).get('/api/settings').set(HEADERS);
    expect(res.status).toBe(200);
    expect(res.body.targetCalendarId).toBe('cal-123');
  });

  it('returns 401 without auth header', async () => {
    const res = await request(app).get('/api/settings').set(TZ);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/settings ──────────────────────────────────────────────────────

describe('PATCH /api/settings', () => {
  it('updates preferredModel and returns it', async () => {
    (prisma.settings.upsert as jest.Mock).mockResolvedValue({
      ...mockSettings,
      preferredModel: 'claude-opus-4-8',
    });
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ preferredModel: 'claude-opus-4-8' });
    expect(res.status).toBe(200);
    expect(res.body.preferredModel).toBe('claude-opus-4-8');
    expect(prisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { preferredModel: 'claude-opus-4-8' } }),
    );
  });

  it('accepts gpt- model IDs', async () => {
    (prisma.settings.upsert as jest.Mock).mockResolvedValue({
      ...mockSettings,
      preferredModel: 'gpt-4o',
    });
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ preferredModel: 'gpt-4o' });
    expect(res.status).toBe(200);
    expect(res.body.preferredModel).toBe('gpt-4o');
  });

  it('updates targetCalendarId', async () => {
    (prisma.settings.upsert as jest.Mock).mockResolvedValue({
      ...mockSettings,
      targetCalendarId: 'cal-abc',
    });
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ targetCalendarId: 'cal-abc' });
    expect(res.status).toBe(200);
    expect(res.body.targetCalendarId).toBe('cal-abc');
    expect(prisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { targetCalendarId: 'cal-abc' } }),
    );
  });

  it('clears targetCalendarId with null', async () => {
    (prisma.settings.upsert as jest.Mock).mockResolvedValue({
      ...mockSettings,
      targetCalendarId: null,
    });
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ targetCalendarId: null });
    expect(res.status).toBe(200);
    expect(res.body.targetCalendarId).toBeNull();
    expect(prisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { targetCalendarId: null } }),
    );
  });

  it('updates both preferredModel and targetCalendarId in one request', async () => {
    (prisma.settings.upsert as jest.Mock).mockResolvedValue({
      ...mockSettings,
      preferredModel: 'claude-opus-4-8',
      targetCalendarId: 'cal-xyz',
    });
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ preferredModel: 'claude-opus-4-8', targetCalendarId: 'cal-xyz' });
    expect(res.status).toBe(200);
    expect(res.body.preferredModel).toBe('claude-opus-4-8');
    expect(res.body.targetCalendarId).toBe('cal-xyz');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).patch('/api/settings').set(HEADERS).send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when preferredModel is empty string', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ preferredModel: '  ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when preferredModel has invalid prefix', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ preferredModel: 'invalid-model' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Claude or GPT/);
  });

  it('returns 400 when targetCalendarId is a number', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set(HEADERS)
      .send({ targetCalendarId: 42 });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth header', async () => {
    const res = await request(app).patch('/api/settings').set(TZ).send({ preferredModel: 'claude-sonnet-4-6' });
    expect(res.status).toBe(401);
  });
});
