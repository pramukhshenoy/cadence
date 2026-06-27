import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import * as settingsLib from '../lib/settings';
import { errorHandler, AppError } from '../middleware/errorHandler';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../lib/settings', () => ({
  getSettings: jest.fn(),
}));

const TZ = { 'X-Timezone': 'UTC' };
const AUTH = { Authorization: 'Bearer test-token' };
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
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with { status: ok } without requiring auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('still returns 200 even with no X-Timezone header', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});

// ─── authMiddleware ───────────────────────────────────────────────────────────

describe('authMiddleware', () => {
  const ORIG_TOKEN = process.env.API_BEARER_TOKEN;

  afterEach(() => {
    process.env.API_BEARER_TOKEN = ORIG_TOKEN;
  });

  it('returns 500 when API_BEARER_TOKEN env var is not set', async () => {
    delete process.env.API_BEARER_TOKEN;
    const res = await request(app).get('/api/settings').set(TZ);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/API_BEARER_TOKEN/);
  });

  it('returns 401 with wrong bearer token', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set({ ...TZ, Authorization: 'Bearer wrong-token' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid bearer token/);
  });

  it('returns 401 with malformed Authorization header (no Bearer prefix)', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set({ ...TZ, Authorization: 'Basic test-token' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Missing or malformed/);
  });

  it('passes through with correct token', async () => {
    const res = await request(app).get('/api/settings').set(HEADERS);
    expect(res.status).toBe(200);
  });
});

// ─── timezoneMiddleware ───────────────────────────────────────────────────────

describe('timezoneMiddleware', () => {
  it('falls back to UTC when X-Timezone header is absent', async () => {
    // The /api/settings endpoint reads timezone from settings, not req.timezone, so it
    // won't 400 — this just verifies the middleware does not crash and the request proceeds.
    const res = await request(app).get('/api/settings').set(AUTH);
    expect(res.status).toBe(200);
  });

  it('falls back to UTC when X-Timezone is an invalid IANA zone', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set({ ...AUTH, 'X-Timezone': 'Not/AZone' });
    expect(res.status).toBe(200);
  });

  it('accepts a valid IANA timezone', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set({ ...AUTH, 'X-Timezone': 'Asia/Kolkata' });
    expect(res.status).toBe(200);
  });
});

// ─── errorHandler ─────────────────────────────────────────────────────────────

describe('errorHandler', () => {
  it('propagates the error message for 4xx (client) errors', async () => {
    // Trigger a 400 via bad input — the route calls next(err) or res.status(400).json(...)
    // Prisma errors with non-500 statusCode propagate the message.
    // Use a route that intentionally returns 400 via validation.
    const res = await request(app)
      .post('/api/tasks')
      .set(HEADERS)
      .send({});
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns "Internal server error" for unexpected 500 errors', async () => {
    // Mock prisma to throw an unhandled error so the route calls next(err)
    (prisma.settings.findUnique as jest.Mock).mockRejectedValue(new Error('DB explosion'));
    (settingsLib.getSettings as jest.Mock).mockRejectedValue(new Error('DB explosion'));
    const res = await request(app).get('/api/settings').set(HEADERS);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });

  it('propagates err.message when statusCode < 500 (direct unit test)', () => {
    const err = new Error('Resource not found') as AppError;
    err.statusCode = 404;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    errorHandler(err, {} as Request, mockRes, jest.fn() as unknown as NextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Resource not found' });
  });
});
