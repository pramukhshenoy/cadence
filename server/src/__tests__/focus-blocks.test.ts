import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    focusBlock: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const AUTH = 'Bearer test-token';

const mockBlock = {
  id: 'block-1',
  deviceCalendarEventId: 'cal-event-1',
  calendarMarker: 'uuid-marker-1',
  startTime: new Date('2026-06-25T09:00:00.000Z'),
  endTime: new Date('2026-06-25T10:00:00.000Z'),
  taskId: null,
  status: 'ACTIVE',
  rescheduled: false,
  rescheduleReason: null,
  createdAt: new Date('2026-06-25T00:00:00.000Z'),
  updatedAt: new Date('2026-06-25T00:00:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/focus-blocks ────────────────────────────────────────────────────

describe('GET /api/focus-blocks', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/focus-blocks');
    expect(res.status).toBe(401);
  });

  it('returns active future blocks', async () => {
    (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([mockBlock]);
    const res = await request(app)
      .get('/api/focus-blocks')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.blocks)).toBe(true);
    expect(res.body.blocks).toHaveLength(1);
  });

  it('queries only ACTIVE blocks in the future', async () => {
    (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([]);
    await request(app).get('/api/focus-blocks').set('Authorization', AUTH);
    expect(prisma.focusBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('orders blocks by startTime ascending', async () => {
    (prisma.focusBlock.findMany as jest.Mock).mockResolvedValue([]);
    await request(app).get('/api/focus-blocks').set('Authorization', AUTH);
    expect(prisma.focusBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { startTime: 'asc' } }),
    );
  });
});

// ─── POST /api/focus-blocks/batch ────────────────────────────────────────────

describe('POST /api/focus-blocks/batch', () => {
  const validBlock = {
    deviceCalendarEventId: 'cal-event-1',
    calendarMarker: 'uuid-marker-1',
    startTime: '2026-06-25T09:00:00.000Z',
    endTime: '2026-06-25T10:00:00.000Z',
  };

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/focus-blocks/batch');
    expect(res.status).toBe(401);
  });

  it('returns 400 when blocks field is missing', async () => {
    const res = await request(app)
      .post('/api/focus-blocks/batch')
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/blocks/);
  });

  it('returns 400 when blocks is not an array', async () => {
    const res = await request(app)
      .post('/api/focus-blocks/batch')
      .set('Authorization', AUTH)
      .send({ blocks: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when all blocks are invalid', async () => {
    const res = await request(app)
      .post('/api/focus-blocks/batch')
      .set('Authorization', AUTH)
      .send({ blocks: [{ foo: 'bar' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No valid blocks/);
  });

  it('creates valid blocks and returns count', async () => {
    (prisma.focusBlock.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await request(app)
      .post('/api/focus-blocks/batch')
      .set('Authorization', AUTH)
      .send({ blocks: [validBlock] });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
  });

  it('skips malformed entries and creates valid ones', async () => {
    (prisma.focusBlock.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await request(app)
      .post('/api/focus-blocks/batch')
      .set('Authorization', AUTH)
      .send({ blocks: [validBlock, { bad: true }, null] });
    expect(res.status).toBe(201);
    expect(prisma.focusBlock.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ calendarMarker: validBlock.calendarMarker })]) }),
    );
  });

  it('passes parsed Date objects to createMany', async () => {
    (prisma.focusBlock.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    await request(app)
      .post('/api/focus-blocks/batch')
      .set('Authorization', AUTH)
      .send({ blocks: [validBlock] });
    const callArg = (prisma.focusBlock.createMany as jest.Mock).mock.calls[0][0] as {
      data: Array<{ startTime: unknown; endTime: unknown }>;
    };
    expect(callArg.data[0].startTime).toBeInstanceOf(Date);
    expect(callArg.data[0].endTime).toBeInstanceOf(Date);
  });
});

// ─── PATCH /api/focus-blocks/batch-delete ────────────────────────────────────

describe('PATCH /api/focus-blocks/batch-delete', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch('/api/focus-blocks/batch-delete');
    expect(res.status).toBe(401);
  });

  it('returns 400 when ids field is missing', async () => {
    const res = await request(app)
      .patch('/api/focus-blocks/batch-delete')
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ids/);
  });

  it('returns 400 when ids contains non-string values', async () => {
    const res = await request(app)
      .patch('/api/focus-blocks/batch-delete')
      .set('Authorization', AUTH)
      .send({ ids: [1, 2, 3] });
    expect(res.status).toBe(400);
  });

  it('marks blocks as DELETED and returns count', async () => {
    (prisma.focusBlock.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    const res = await request(app)
      .patch('/api/focus-blocks/batch-delete')
      .set('Authorization', AUTH)
      .send({ ids: ['block-1', 'block-2'] });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('calls updateMany with DELETED status', async () => {
    (prisma.focusBlock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    await request(app)
      .patch('/api/focus-blocks/batch-delete')
      .set('Authorization', AUTH)
      .send({ ids: ['block-1'] });
    expect(prisma.focusBlock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['block-1'] } },
        data: { status: 'DELETED' },
      }),
    );
  });

  it('handles empty ids array gracefully', async () => {
    (prisma.focusBlock.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const res = await request(app)
      .patch('/api/focus-blocks/batch-delete')
      .set('Authorization', AUTH)
      .send({ ids: [] });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});
