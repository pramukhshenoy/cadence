export type ModelOption = { id: string; label: string };

export const CLAUDE_MODELS: ModelOption[] = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
];

export const OPENAI_MODELS: ModelOption[] = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
];

export function isValidModelId(id: string): boolean {
  return [...CLAUDE_MODELS, ...OPENAI_MODELS].some((m) => m.id === id);
}
