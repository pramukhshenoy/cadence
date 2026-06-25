import { useEffect } from 'react';

import {
  deleteCalendarEvent,
  getCalendarPermissionStatus,
  getSourceCalendarIds,
  readWeekEvents,
  writeFocusBlock,
} from '@/lib/calendar';
import {
  archiveFocusBlocks,
  getActiveFutureBlocks,
  NewFocusBlock,
  postCalendarSync,
  saveFocusBlocks,
} from '@/lib/focus-blocks';
import { useAppSettings } from '@/lib/settings';

export function useCalendarSync() {
  const { data: settings } = useAppSettings();

  useEffect(() => {
    if (!settings?.targetCalendarId) return;
    let cancelled = false;
    const targetCalendarId = settings.targetCalendarId;

    async function runSync() {
      const permStatus = await getCalendarPermissionStatus();
      if (cancelled || permStatus !== 'granted') return;

      // Fetch active blocks and source calendar IDs in parallel
      const [activeBlocks, sourceCalendarIds] = await Promise.all([
        getActiveFutureBlocks(),
        getSourceCalendarIds(),
      ]);
      if (cancelled) return;

      // Step 1: delete active future blocks from device calendar
      // Delete failures (event already gone) are tolerated — we archive all regardless below
      if (activeBlocks.length > 0) {
        await Promise.allSettled(
          activeBlocks.map((b) => deleteCalendarEvent(b.deviceCalendarEventId)),
        );
        if (cancelled) return;
      }

      // Steps 1b + 2: archive backend records and read week events in parallel
      // (archiving and calendar read are independent — saves one RTT on the critical path)
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const [, events] = await Promise.all([
        activeBlocks.length > 0
          ? archiveFocusBlocks(activeBlocks.map((b) => b.id))
          : Promise.resolve(0),
        readWeekEvents(sourceCalendarIds, now, weekEnd),
      ]);
      if (cancelled) return;

      // Step 3: get optimised focus block schedule from backend
      const { focusBlocks } = await postCalendarSync(events);
      if (cancelled || focusBlocks.length === 0) return;

      // Step 4: write focus blocks to device calendar (calendarMarker in notes)
      const writeResults = await Promise.allSettled(
        focusBlocks.map((b) => writeFocusBlock(targetCalendarId, b)),
      );
      if (cancelled) return;

      // Step 5: persist successful writes to backend
      const toSave: NewFocusBlock[] = focusBlocks.flatMap((b, i) => {
        const result = writeResults[i];
        if (result.status !== 'fulfilled' || !result.value) return [];
        return [{
          deviceCalendarEventId: result.value,
          calendarMarker: b.calendarMarker,
          startTime: b.startTime,
          endTime: b.endTime,
        }];
      });

      if (toSave.length > 0) {
        await saveFocusBlocks(toSave);
      }
    }

    runSync().catch((err: unknown) => {
      if (!cancelled) {
        console.error('[CalendarSync]', err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [settings?.targetCalendarId]);
}
