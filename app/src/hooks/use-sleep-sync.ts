import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';

import { initHealthConnect, requestSleepPermission, readLastNightSleep, type AggregateSleepData } from '@/lib/health-connect';
import { useAppSettings } from '@/lib/settings';
import type { SleepQuality, SleepSummary } from '@/types/sleep';

export const SLEEP_SUMMARY_KEY = ['sleep-summary'] as const;

// Internal cache for raw sensor data — only written on a successful HC read,
// so it is safe to use as an "already read today" guard without false positives.
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

  // Refs let Effect 1 read the latest threshold values without adding them to
  // its dependency array (which would re-trigger the expensive HC read on every
  // settings change).
  const thresholdRef = useRef(sleepThresholdHours);
  const goodRef = useRef(goodThresholdHours);
  useEffect(() => {
    thresholdRef.current = sleepThresholdHours;
    goodRef.current = goodThresholdHours;
  }, [sleepThresholdHours, goodThresholdHours]);

  // Effect 1: Read raw sleep data from Health Connect once per session.
  // Guards on RAW_SLEEP_KEY, which is only written on a successful read —
  // errors do NOT write any cache key so future mounts can retry.
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

      // Compute quality immediately using the latest threshold values from refs.
      // Using refs (not state) avoids re-running this effect when thresholds change.
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

    // Do NOT write SLEEP_SUMMARY_KEY on error — keeps the cache clear so
    // the next mount can retry rather than being permanently locked out.
    run().catch((err: unknown) => {
      if (!cancelled) console.error('[SleepSync]', err);
    });

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  // Effect 2: Re-derive quality label when thresholds change.
  // Never reads Health Connect — only touches the in-memory cache.
  // Preserves rescheduledCount written by the reschedule flow in phases 5b/5c.
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

// Reactive hook — returns undefined before sync, null for no data, SleepSummary otherwise.
// skipToken ensures TanStack Query never executes a queryFn and never primes the cache,
// while still subscribing to setQueryData updates so callers re-render when data arrives.
export function useSleepSummary(): SleepSummary | null | undefined {
  const { data } = useQuery<SleepSummary | null>({
    queryKey: SLEEP_SUMMARY_KEY,
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data;
}
