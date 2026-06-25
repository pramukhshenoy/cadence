import { apiFetch } from './api-client';
import type { SleepSummary } from '@/types/sleep';

export interface SleepReschedulePlan {
  performed: boolean;
  blocksToDelete: { id: string; deviceCalendarEventId: string }[];
  newBlocks: {
    calendarMarker: string;
    startTime: string;
    endTime: string;
    title: string;
  }[];
  droppedCount: number;
}

export async function postSleepRecord(
  summary: Pick<SleepSummary, 'localDate' | 'durationHours' | 'quality' | 'deepSleepHours' | 'remSleepHours' | 'sessionCount'>,
): Promise<SleepReschedulePlan> {
  const res = await apiFetch('/api/sleep', {
    method: 'POST',
    body: JSON.stringify({
      localDate: summary.localDate,
      durationHours: summary.durationHours,
      quality: summary.quality,
      deepSleepHours: summary.deepSleepHours,
      remSleepHours: summary.remSleepHours,
      sessionCount: summary.sessionCount,
    }),
  });
  if (!res.ok) throw new Error('Failed to post sleep record');
  const data = (await res.json()) as { reschedule: SleepReschedulePlan };
  return data.reschedule;
}
