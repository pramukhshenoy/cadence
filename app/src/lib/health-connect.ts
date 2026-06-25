import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

// Health Connect sleep stage numeric constants
// (mirrors SleepStageType from react-native-health-connect)
const STAGE_DEEP = 5;
const STAGE_REM = 6;

export type AggregateSleepData = {
  localDate: string;
  durationHours: number;
  deepSleepHours: number | null;
  remSleepHours: number | null;
  sessionCount: number;
};

function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function initHealthConnect(): Promise<boolean> {
  const status = await getSdkStatus();
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  return initialize();
}

// Requests READ_SLEEP permission (no-op if already granted on Android).
// Returns true if permission is held after the call.
export async function requestSleepPermission(): Promise<boolean> {
  const granted = await requestPermission([
    { accessType: 'read', recordType: 'SleepSession' },
  ]);
  return granted.some(
    (p) => p.recordType === 'SleepSession' && p.accessType === 'read',
  );
}

// Reads sleep sessions for the previous night.
// Window: yesterday 18:00 → today 12:00 (local device time).
// Returns null if no sessions found.
export async function readLastNightSleep(): Promise<AggregateSleepData | null> {
  const now = new Date();

  const windowStart = new Date(now);
  windowStart.setDate(now.getDate() - 1);
  windowStart.setHours(18, 0, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setHours(12, 0, 0, 0);
  // If current time is before noon, cap at now so we don't request a future window
  if (windowEnd > now) windowEnd.setTime(now.getTime());

  const { records } = await readRecords('SleepSession', {
    timeRangeFilter: {
      operator: 'between',
      startTime: windowStart.toISOString(),
      endTime: windowEnd.toISOString(),
    },
  });

  if (!records || records.length === 0) return null;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const localDate = localDateString(yesterday);

  let totalMs = 0;
  let deepMs = 0;
  let remMs = 0;
  let hasStageData = false;

  for (const session of records) {
    totalMs +=
      new Date(session.endTime).getTime() - new Date(session.startTime).getTime();

    if (session.stages && session.stages.length > 0) {
      hasStageData = true;
      for (const stage of session.stages) {
        const dur =
          new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime();
        if (stage.stage === STAGE_DEEP) deepMs += dur;
        if (stage.stage === STAGE_REM) remMs += dur;
      }
    }
  }

  return {
    localDate,
    durationHours: totalMs / 3_600_000,
    deepSleepHours: hasStageData ? deepMs / 3_600_000 : null,
    remSleepHours: hasStageData ? remMs / 3_600_000 : null,
    sessionCount: records.length,
  };
}
