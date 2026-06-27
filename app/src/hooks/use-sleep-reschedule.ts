import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { deleteCalendarEvent, writeFocusBlock } from '@/lib/calendar';
import {
  archiveFocusBlocks,
  saveFocusBlocks,
  NewFocusBlock,
  FOCUS_WEEK_SUMMARY_KEY,
} from '@/lib/focus-blocks';
import { postSleepRecord } from '@/lib/sleep';
import { showToast } from '@/lib/toast';
import { useAppSettings } from '@/lib/settings';
import { useSleepSummary, SLEEP_SUMMARY_KEY } from '@/hooks/use-sleep-sync';
import type { SleepSummary } from '@/types/sleep';

// written synchronously before async run starts — prevents concurrent runs
const RESCHEDULE_ATTEMPTED_KEY = ['sleep-reschedule-attempted'] as const;

export function useSleepReschedule() {
  const summary = useSleepSummary();
  const { data: settings } = useAppSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!summary || summary.quality !== 'POOR') return;
    if (!settings?.targetCalendarId) return;
    if (queryClient.getQueryData(RESCHEDULE_ATTEMPTED_KEY) !== undefined) return;

    const targetCalendarId = settings.targetCalendarId;
    // TypeScript can't narrow `summary` through the async closure — explicit type capture
    const sleepSummary: SleepSummary = summary;
    let cancelled = false;

    queryClient.setQueryData(RESCHEDULE_ATTEMPTED_KEY, true);

    async function run() {
      // post sleep record first — persists the record even if calendar operations later fail
      const plan = await postSleepRecord(sleepSummary);
      if (cancelled) return;

      if (!plan.performed || plan.blocksToDelete.length === 0) return;

      // calendar deletion failures tolerated — block may already be gone
      await Promise.allSettled(
        plan.blocksToDelete.map((b) => deleteCalendarEvent(b.deviceCalendarEventId)),
      );
      if (cancelled) return;

      await archiveFocusBlocks(plan.blocksToDelete.map((b) => b.id));
      if (cancelled) return;

      // invalidate now — archived blocks change scheduled hours regardless of whether new ones were placed
      queryClient.invalidateQueries({ queryKey: FOCUS_WEEK_SUMMARY_KEY });

      if (plan.newBlocks.length === 0) return;

      const writeResults = await Promise.allSettled(
        plan.newBlocks.map((b) => writeFocusBlock(targetCalendarId, b)),
      );
      if (cancelled) return;

      const toSave: NewFocusBlock[] = plan.newBlocks.flatMap((b, i) => {
        const r = writeResults[i];
        if (r.status !== 'fulfilled' || !r.value) return [];
        return [{ deviceCalendarEventId: r.value, calendarMarker: b.calendarMarker, startTime: b.startTime, endTime: b.endTime }];
      });

      if (toSave.length > 0) {
        await saveFocusBlocks(toSave);
        if (cancelled) return;
      }

      const count = toSave.length;
      queryClient.setQueryData<SleepSummary | null>(SLEEP_SUMMARY_KEY, (prev) => {
        if (!prev) return prev;
        const updated: SleepSummary = { ...prev, rescheduledCount: count };
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: FOCUS_WEEK_SUMMARY_KEY });
    }

    // guard stays set on error — prevents a retry storm if the backend is temporarily down
    run().catch((err: unknown) => {
      if (!cancelled) {
        console.error('[SleepReschedule]', err);
        showToast('Sleep reschedule failed');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [summary, settings?.targetCalendarId, queryClient]);
}
