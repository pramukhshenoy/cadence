import { apiFetch } from './api-client';

export interface FocusBlock {
  id: string;
  deviceCalendarEventId: string;
  calendarMarker: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'DELETED';
}

export interface NewFocusBlock {
  deviceCalendarEventId: string;
  calendarMarker: string;
  startTime: string;
  endTime: string;
}

export interface FocusBlockScheduled {
  calendarMarker: string;
  startTime: string;
  endTime: string;
  title: string;
}

export interface SchedulerResult {
  focusBlocks: FocusBlockScheduled[];
  scheduledHours: number;
  requestedHours: number;
  shortfallHours: number;
}

export async function getActiveFutureBlocks(): Promise<FocusBlock[]> {
  const res = await apiFetch('/api/focus-blocks');
  if (!res.ok) throw new Error('Failed to fetch focus blocks');
  const data = (await res.json()) as { blocks: FocusBlock[] };
  return data.blocks;
}

export async function saveFocusBlocks(blocks: NewFocusBlock[]): Promise<number> {
  const res = await apiFetch('/api/focus-blocks/batch', {
    method: 'POST',
    body: JSON.stringify({ blocks }),
  });
  if (!res.ok) throw new Error('Failed to save focus blocks');
  const data = (await res.json()) as { count: number };
  return data.count;
}

export async function archiveFocusBlocks(ids: string[]): Promise<number> {
  const res = await apiFetch('/api/focus-blocks/batch-delete', {
    method: 'PATCH',
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to archive focus blocks');
  const data = (await res.json()) as { count: number };
  return data.count;
}

export async function postCalendarSync(
  events: { startTime: string; endTime: string }[],
): Promise<SchedulerResult> {
  const res = await apiFetch('/api/calendar/sync', {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
  if (!res.ok) throw new Error('Failed to run calendar sync');
  return res.json() as Promise<SchedulerResult>;
}
