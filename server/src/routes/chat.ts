import { Router, Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { TaskStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { getSettings } from '../lib/settings';
import { CLAUDE_MODELS, OPENAI_MODELS, isValidModelId } from '../lib/models';

const router = Router();

// ─── Provider singletons ──────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

function getAnthropic(apiKey: string): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

function getOpenAI(apiKey: string): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey });
  return _openai;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayLocalDate(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function buildSystemPrompt(tz: string): Promise<string> {
  const today = todayLocalDate(tz);
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const [tasks, habits] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: TaskStatus.DONE } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    }),
    prisma.habit.findMany({
      include: {
        completions: { where: { localDate: today } },
      },
    }),
  ]);

  const taskSection =
    tasks.length === 0
      ? 'No open tasks.'
      : tasks
          .map((t) => {
            // Use timezone-aware formatting — toISOString() would give the UTC date, not the user's local date
            const due = t.dueDate ? ` (due: ${dateFormatter.format(t.dueDate)})` : '';
            return `- [${t.priority}] ${t.title}${due}`;
          })
          .join('\n');

  const habitSection =
    habits.length === 0
      ? 'No habits configured.'
      : habits
          .map((h) => {
            const done = h.completions.length > 0;
            return `- ${h.name}: ${done ? '✓ completed' : '✗ not done'}`;
          })
          .join('\n');

  return `You are a personal assistant for Cadence, a personal productivity app. Help the user manage their tasks, habits, and schedule.

Today's date: ${today}

## Open Tasks
${taskSection}

## Today's Habits
${habitSection}

Keep responses concise and actionable. When referencing tasks or habits, use the information above.`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/models', (_req: Request, res: Response) => {
  const models = [...CLAUDE_MODELS];
  if (process.env.OPENAI_API_KEY) models.push(...OPENAI_MODELS);
  res.json({ models });
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, message, model: modelOverride } = (req.body ?? {}) as {
      conversationId: unknown;
      message: unknown;
      model: unknown;
    };

    if (!conversationId || typeof conversationId !== 'string' || !conversationId.trim()) {
      res.status(400).json({ error: 'conversationId is required' });
      return;
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }
    if (typeof modelOverride === 'string' && modelOverride.trim()) {
      if (!isValidModelId(modelOverride.trim())) {
        res.status(400).json({ error: 'model must be a valid Claude or GPT model ID' });
        return;
      }
    }

    // Register the abort controller before any async work so disconnect events during
    // DB queries are captured and can be checked before starting the AI stream.
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    const trimmedMessage = message.trim();

    // Fetch prior history, system prompt, and settings before flushing headers.
    // Keeping DB ops before flushHeaders means failures here can still return a proper HTTP error.
    const [rawPrior, systemPrompt, settings] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 19, // 19 prior + 1 current user message = 20 sent to the AI
      }),
      buildSystemPrompt(req.timezone),
      getSettings(prisma),
    ]);
    rawPrior.reverse();

    // Anthropic requires the first message to be role 'user'. Drop any leading ASSISTANT messages
    // that can appear when the context window truncates at an ASSISTANT boundary.
    const firstUserIdx = rawPrior.findIndex((m) => m.role === 'USER');
    const priorHistory = firstUserIdx >= 0 ? rawPrior.slice(firstUserIdx) : [];

    const model =
      typeof modelOverride === 'string' && modelOverride.trim()
        ? modelOverride.trim()
        : settings.preferredModel;

    const isGpt = model.startsWith('gpt-');

    if (isGpt) {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
        return;
      }
    } else {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
        return;
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullContent = '';

    try {
      if (isGpt) {
        const openai = getOpenAI(process.env.OPENAI_API_KEY!);
        const sdkMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...priorHistory.map((m) => ({
            role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: trimmedMessage },
        ];

        const stream = await openai.chat.completions.create(
          { model, max_tokens: 1024, messages: sdkMessages, stream: true },
          { signal: abortController.signal },
        );

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
          }
        }
      } else {
        const anthropic = getAnthropic(process.env.ANTHROPIC_API_KEY!);
        const sdkMessages: Anthropic.MessageParam[] = [
          ...priorHistory.map((m) => ({
            role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user' as const, content: trimmedMessage },
        ];

        const stream = await anthropic.messages.create(
          { model, max_tokens: 1024, system: systemPrompt, messages: sdkMessages, stream: true },
          { signal: abortController.signal },
        );

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullContent += text;
            res.write(`data: ${JSON.stringify({ type: 'delta', content: text })}\n\n`);
          }
        }
      }
    } catch (streamErr) {
      if (!abortController.signal.aborted) {
        console.error('Chat stream error:', streamErr);
      }
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Streaming failed' })}\n\n`);
      res.end();
      return;
    }

    // Persist both messages atomically only after a successful stream.
    // A transaction prevents an orphaned USER row if the ASSISTANT write fails.
    // A DB failure here is logged but does not abort the SSE response — the client already has the content.
    if (fullContent) {
      try {
        await prisma.$transaction([
          prisma.chatMessage.create({ data: { conversationId, role: 'USER', content: trimmedMessage } }),
          prisma.chatMessage.create({ data: { conversationId, role: 'ASSISTANT', content: fullContent } }),
        ]);
      } catch (dbErr) {
        console.error('Failed to persist chat messages:', dbErr);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
