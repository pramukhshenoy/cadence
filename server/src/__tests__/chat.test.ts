import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import * as settingsLib from '../lib/settings';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
  (MockAnthropic as unknown as Record<string, unknown>).__mockCreate = mockCreate;
  return { __esModule: true, default: MockAnthropic };
});

jest.mock('openai', () => {
  const mockCreate = jest.fn();
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
  (MockOpenAI as unknown as Record<string, unknown>).__mockCreate = mockCreate;
  return { __esModule: true, default: MockOpenAI };
});

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    habit: {
      findMany: jest.fn(),
    },
    settings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../lib/settings', () => ({
  getSettings: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTH = { Authorization: 'Bearer test-token' };
const TZ = { 'X-Timezone': 'UTC' };
const HEADERS = { ...AUTH, ...TZ };

function getMockCreate() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Anthropic = require('@anthropic-ai/sdk').default;
  return (Anthropic as unknown as Record<string, unknown>).__mockCreate as jest.Mock;
}

function getOpenAIMockCreate() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require('openai').default;
  return (OpenAI as unknown as Record<string, unknown>).__mockCreate as jest.Mock;
}

function makeOpenAIStream(chunks: string[]) {
  return (async function* () {
    for (const text of chunks) {
      yield { choices: [{ delta: { content: text } }] };
    }
  })();
}

function makeStream(chunks: string[]) {
  return (async function* () {
    for (const text of chunks) {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    }
  })();
}

function postChat(body: object) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request(app).post('/api/chat').set(HEADERS).send(body).buffer(true).parse((res: any, callback: any) => {
    let data = '';
    res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    res.on('end', () => callback(null, data));
  });
}

function parseSSE(body: string): Array<Record<string, unknown>> {
  return body
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)) as Record<string, unknown>);
}

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

const ORIG_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ORIG_OPENAI_KEY = process.env.OPENAI_API_KEY;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.OPENAI_API_KEY;

  (prisma.chatMessage.create as jest.Mock).mockResolvedValue({});
  (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.$transaction as jest.Mock).mockImplementation((ops: unknown[]) => Promise.all(ops));
  (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.habit.findMany as jest.Mock).mockResolvedValue([]);
  (settingsLib.getSettings as jest.Mock).mockResolvedValue(mockSettings);
  getMockCreate().mockResolvedValue(makeStream(['Hi', ' there']));
});

afterAll(() => {
  process.env.ANTHROPIC_API_KEY = ORIG_ANTHROPIC_KEY;
  process.env.OPENAI_API_KEY = ORIG_OPENAI_KEY;
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/chat validation', () => {
  it('returns 400 when conversationId is missing', async () => {
    const res = await request(app).post('/api/chat').set(HEADERS).send({ message: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/conversationId/);
  });

  it('returns 400 when conversationId is empty', async () => {
    const res = await request(app).post('/api/chat').set(HEADERS).send({ conversationId: '  ', message: 'hello' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/chat').set(HEADERS).send({ conversationId: 'conv1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/);
  });

  it('returns 400 when message is empty', async () => {
    const res = await request(app).post('/api/chat').set(HEADERS).send({ conversationId: 'conv1', message: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when model is not a valid Claude or GPT prefix', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set(HEADERS)
      .send({ conversationId: 'conv1', message: 'hello', model: 'invalid-model' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Claude or GPT/);
  });

  it('returns 500 when gpt model is requested but OPENAI_API_KEY is not set', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set(HEADERS)
      .send({ conversationId: 'conv1', message: 'hello', model: 'gpt-4o' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/OPENAI_API_KEY/);
  });

  it('returns 500 when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await request(app).post('/api/chat').set(HEADERS).send({ conversationId: 'conv1', message: 'hello' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/ANTHROPIC_API_KEY/);
  });
});

// ─── Success flow ─────────────────────────────────────────────────────────────

describe('POST /api/chat success', () => {
  it('streams assistant response and persists both messages after stream', async () => {
    const res = await postChat({ conversationId: 'conv1', message: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    // SSE events: two deltas + done
    const events = parseSSE(res.body as string);
    expect(events).toContainEqual({ type: 'delta', content: 'Hi' });
    expect(events).toContainEqual({ type: 'delta', content: ' there' });
    expect(events[events.length - 1]).toEqual({ type: 'done' });

    // Both messages persisted atomically via $transaction after successful stream
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ then: expect.any(Function) }), // USER create promise
        expect.objectContaining({ then: expect.any(Function) }), // ASSISTANT create promise
      ])
    );
    expect(prisma.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'USER', content: 'Hello' }) })
    );
    expect(prisma.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ASSISTANT', content: 'Hi there' }) })
    );
  });

  it('uses preferredModel from settings by default', async () => {
    await postChat({ conversationId: 'conv1', message: 'Hello' });
    expect(getMockCreate()).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6' }),
      expect.anything(),
    );
  });

  it('uses model override when it starts with claude-', async () => {
    await postChat({ conversationId: 'conv1', message: 'Hello', model: 'claude-opus-4-8' });
    expect(getMockCreate()).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-8' }),
      expect.anything(),
    );
  });

  it('fetches last 19 prior messages and appends current user message as the 20th', async () => {
    (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 19 }, (_, i) => ({
        id: String(i),
        conversationId: 'conv1',
        role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
        content: `msg ${i}`,
        createdAt: new Date(),
      }))
    );

    await postChat({ conversationId: 'conv1', message: 'Hello' });

    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 19 })
    );
    const call = getMockCreate().mock.calls[0][0] as { messages: Array<{ role: string; content: string }> };
    // Last sdkMessage is always the current user message
    expect(call.messages[call.messages.length - 1]).toEqual({ role: 'user', content: 'Hello' });
  });

  it('drops leading ASSISTANT messages when history is truncated at an ASSISTANT boundary', async () => {
    // Simulates a conversation where take:19 drops the oldest USER, leaving ASST first
    (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', conversationId: 'conv1', role: 'ASSISTANT', content: 'reply 1', createdAt: new Date() },
      { id: 'u2', conversationId: 'conv1', role: 'USER', content: 'msg 2', createdAt: new Date() },
      { id: 'a2', conversationId: 'conv1', role: 'ASSISTANT', content: 'reply 2', createdAt: new Date() },
    ]);

    await postChat({ conversationId: 'conv1', message: 'Hello' });

    const call = getMockCreate().mock.calls[0][0] as { messages: Array<{ role: string }> };
    // First sdkMessage must be 'user', not 'assistant'
    expect(call.messages[0].role).toBe('user');
  });

  it('includes tasks and habits in the system prompt', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      { id: 't1', title: 'Write report', priority: 'HIGH', dueDate: new Date('2026-06-25'), status: 'TODO', description: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    (prisma.habit.findMany as jest.Mock).mockResolvedValue([
      { id: 'h1', name: 'Morning run', completions: [{ localDate: '2026-06-23' }], description: null, frequency: 'DAILY', weeklyTargetDays: null, createdAt: new Date(), updatedAt: new Date() },
    ]);

    await postChat({ conversationId: 'conv1', message: 'What should I do today?' });

    const call = getMockCreate().mock.calls[0][0] as { system: string };
    expect(call.system).toContain('Write report');
    expect(call.system).toContain('[HIGH]');
    expect(call.system).toContain('Morning run');
    expect(call.system).toContain('✓ completed');
  });

  it('does not persist messages if stream produces no content', async () => {
    getMockCreate().mockResolvedValue(makeStream([])); // empty stream
    await postChat({ conversationId: 'conv1', message: 'Hello' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─── OpenAI streaming ────────────────────────────────────────────────────────

describe('POST /api/chat OpenAI', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    getOpenAIMockCreate().mockResolvedValue(makeOpenAIStream(['Hello', ' world']));
  });

  it('streams assistant response via OpenAI when model starts with gpt-', async () => {
    const res = await postChat({ conversationId: 'conv1', message: 'Hi', model: 'gpt-4o' });
    expect(res.status).toBe(200);
    const events = parseSSE(res.body as string);
    expect(events).toContainEqual({ type: 'delta', content: 'Hello' });
    expect(events).toContainEqual({ type: 'delta', content: ' world' });
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('routes gpt model to OpenAI, not Anthropic', async () => {
    await postChat({ conversationId: 'conv1', message: 'Hi', model: 'gpt-4o' });
    expect(getMockCreate()).not.toHaveBeenCalled();
    expect(getOpenAIMockCreate()).toHaveBeenCalled();
  });
});

// ─── Models endpoint ──────────────────────────────────────────────────────────

describe('GET /api/chat/models', () => {
  it('returns only claude models when OPENAI_API_KEY is not set', async () => {
    const res = await request(app).get('/api/chat/models').set(HEADERS);
    expect(res.status).toBe(200);
    const ids = (res.body.models as Array<{ id: string }>).map((m) => m.id);
    expect(ids.every((id) => id.startsWith('claude-'))).toBe(true);
    expect(ids.some((id) => id.startsWith('gpt-'))).toBe(false);
  });

  it('includes gpt models when OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const res = await request(app).get('/api/chat/models').set(HEADERS);
    expect(res.status).toBe(200);
    const ids = (res.body.models as Array<{ id: string }>).map((m) => m.id);
    expect(ids.some((id) => id.startsWith('gpt-'))).toBe(true);
  });

  it('each model has id and label', async () => {
    const res = await request(app).get('/api/chat/models').set(HEADERS);
    for (const model of res.body.models as Array<{ id: string; label: string }>) {
      expect(typeof model.id).toBe('string');
      expect(typeof model.label).toBe('string');
    }
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/chat auth', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).post('/api/chat').set(TZ).send({ conversationId: 'conv1', message: 'hello' });
    expect(res.status).toBe(401);
  });
});
