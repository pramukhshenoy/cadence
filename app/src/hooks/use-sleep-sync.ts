import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';

import { initHealthConnect, requestSleepPermission, readLastNightSleep, type AggregateSleepData } from '@/lib/health-connect';
import { useAppSettings } from '@/lib/settings';
import type { SleepQuality, SleepSummary } from '@/types/sleep';

export const SLEEP_SUMMARY_KEY = ['sleep-summary'] as const;

// only written on successful HC read — safe "already read today" guard
const RAW_SLEEP_KEY = ['sleep-raw'] as const;

function deriveSleepQuality(
  durationHours: number,
  sleepThresholdHours: number,
  goodThresholdHours: number,
): SleepQuality {
  if (durationHours < sleepThresholdHours) return 'POOR';
  if (durationHours < goodThresholdHours) return 'FAIR';
  return 'GOOD';
}

export function useSleepSync() {
  const { data: settings } = useAppSettings();
  const queryClient = useQueryClient();
  const sleepThresholdHours = settings?.sleepThresholdHours;
  const goodThresholdHours = settings?.goodThresholdHours;

  // refs let Effect 1 read latest thresholds without re-triggering on settings change
  const thresholdRef = useRef(sleepThresholdHours);
  const goodRef = useRef(goodThresholdHours);
  useEffect(() => {
    thresholdRef.current = sleepThresholdHours;
    goodRef.current = goodThresholdHours;
  }, [sleepThresholdHours, goodThresholdHours]);

  // Effect 1: reads HC once per session; errors leave cache empty so future mounts can retry
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let cancelled = false;

    async function run() {
      const existing = queryClient.getQueryData<AggregateSleepData | null>(RAW_SLEEP_KEY);
      if (existing !== undefined) return; // already read this session

      const initialized = await initHealthConnect();
      if (cancelled || !initialized) return;

      const granted = await requestSleepPermission();
      if (cancelled || !granted) return;

      const raw = await readLastNightSleep();
      if (cancelled) return;

      // Write raw first — this marks "already read" so future mounts skip the HC call.
      queryClient.setQueryData<AggregateSleepData | null>(RAW_SLEEP_KEY, raw ?? null);

      if (!raw) {
        queryClient.setQueryData<SleepSummary | null>(SLEEP_SUMMARY_KEY, null);
        return;
      }

      // refs hold latest thresholds without re-running this effect on settings change
      const threshold = thresholdRef.current ?? 6.5;
      const good = goodRef.current ?? 7.0;
      const quality = deriveSleepQuality(raw.durationHours, threshold, good);

      const summary: SleepSummary = {
        localDate: raw.localDate,
        durationHours: raw.durationHours,
        quality,
        deepSleepHours: raw.deepSleepHours,
        remSleepHours: raw.remSleepHours,
        sessionCount: raw.sessionCount,
        rescheduledCount: 0,
      };
      queryClient.setQueryData(SLEEP_SUMMARY_KEY, summary);
    }

    // on error: don't write cache — next mount can retry
    run().catch((err: unknown) => {
      if (!cancelled) console.error('[SleepSync]', err);
    });

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  // Effect 2: re-derives quality on threshold change without re-reading HC; preserves rescheduledCount
  useEffect(() => {
    if (sleepThresholdHours === undefined || goodThresholdHours === undefined) return;

    const raw = queryClient.getQueryData<AggregateSleepData | null>(RAW_SLEEP_KEY);
    if (!raw) return; // undefined (not yet read) or null (no data)

    const quality = deriveSleepQuality(raw.durationHours, sleepThresholdHours, goodThresholdHours);
    const prev = queryClient.getQueryData<SleepSummary | null>(SLEEP_SUMMARY_KEY);

    const summary: SleepSummary = {
      localDate: raw.localDate,
      durationHours: raw.durationHours,
      quality,
      deepSleepHours: raw.deepSleepHours,
      remSleepHours: raw.remSleepHours,
      sessionCount: raw.sessionCount,
      rescheduledCount: prev?.rescheduledCount ?? 0,
    };
    queryClient.setQueryData(SLEEP_SUMMARY_KEY, summary);
  }, [sleepThresholdHours, goodThresholdHours, queryClient]);
}

// skipToken subscribes to setQueryData updates without executing a queryFn or priming the cache
export function useSleepSummary(): SleepSummary | null | undefined {
  const { data } = useQuery<SleepSummary | null>({
    queryKey: SLEEP_SUMMARY_KEY,
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data;
}
