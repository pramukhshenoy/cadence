import { randomUUID } from 'crypto';
import { localTimeToUtc, MIN_BLOCK_MINUTES, BLOCK_DURATION_MINUTES } from './scheduler';

export interface MorningBlock {
  id: string;
  startTime: Date;
  endTime: Date;
}

export interface BusySlot {
  startTime: Date;
  endTime: Date;
}

export interface RescheduleInput {
  morningBlocks: MorningBlock[];
  busySlots: BusySlot[];
  settings: {
    morningCutoffHour: number;
    workdayStartHour: number;
    workdayEndHour: number;
  };
  timezone: string;
  todayStr: string;    // "YYYY-MM-DD" in device local time
  tomorrowStr: string; // "YYYY-MM-DD" in device local time
  now: Date;
}

export interface NewBlock {
  calendarMarker: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  title: string;
}

export interface RescheduleResult {
  blocksToDelete: string[];
  newBlocks: NewBlock[];
  droppedCount: number;
}

function freeGaps(
  windowStart: Date,
  windowEnd: Date,
  busy: BusySlot[],
): Array<{ start: Date; end: Date }> {
  const overlapping = busy
    .filter((b) => b.endTime > windowStart && b.startTime < windowEnd)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  let cursor = windowStart;
  const gaps: Array<{ start: Date; end: Date }> = [];

  for (const b of overlapping) {
    const bStart = b.startTime < windowStart ? windowStart : b.startTime;
    const bEnd = b.endTime > windowEnd ? windowEnd : b.endTime;
    if (bStart > cursor) gaps.push({ start: cursor, end: bStart });
    if (bEnd > cursor) cursor = bEnd;
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd });

  return gaps;
}

function fillGaps(
  gaps: Array<{ start: Date; end: Date }>,
  remainingMinutes: number,
  out: NewBlock[],
): number {
  for (const gap of gaps) {
    if (remainingMinutes < MIN_BLOCK_MINUTES) break;
    let cursor = gap.start;

    while (remainingMinutes >= MIN_BLOCK_MINUTES) {
      const availableMin = (gap.end.getTime() - cursor.getTime()) / 60000;
      if (availableMin < MIN_BLOCK_MINUTES) break;

      const blockMin = Math.min(BLOCK_DURATION_MINUTES, availableMin, remainingMinutes);
      const blockEnd = new Date(cursor.getTime() + blockMin * 60000);
      out.push({
        calendarMarker: randomUUID(),
        startTime: cursor.toISOString(),
        endTime: blockEnd.toISOString(),
        title: 'Focus Block',
      });

      remainingMinutes -= blockMin;
      cursor = blockEnd;
    }
  }
  return remainingMinutes;
}

export function computeReschedule(input: RescheduleInput): RescheduleResult {
  const { morningBlocks, busySlots, settings, timezone, todayStr, tomorrowStr, now } = input;
  const { morningCutoffHour, workdayStartHour, workdayEndHour } = settings;

  if (morningBlocks.length === 0) {
    return { blocksToDelete: [], newBlocks: [], droppedCount: 0 };
  }

  const blocksToDelete = morningBlocks.map((b) => b.id);
  let remainingMinutes = morningBlocks.reduce(
    (sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / 60000,
    0,
  );

  const newBlocks: NewBlock[] = [];

  const afternoonWindowStart = localTimeToUtc(todayStr, morningCutoffHour, 0, timezone);
  const afternoonWindowEnd = localTimeToUtc(todayStr, workdayEndHour, 0, timezone);
  const effectiveStart = now > afternoonWindowStart ? now : afternoonWindowStart;

  if (effectiveStart < afternoonWindowEnd) {
    const gaps = freeGaps(effectiveStart, afternoonWindowEnd, busySlots);
    remainingMinutes = fillGaps(gaps, remainingMinutes, newBlocks);
  }

  if (remainingMinutes >= MIN_BLOCK_MINUTES) {
    const tomorrowStart = localTimeToUtc(tomorrowStr, workdayStartHour, 0, timezone);
    const tomorrowCutoff = localTimeToUtc(tomorrowStr, morningCutoffHour, 0, timezone);
    const gaps = freeGaps(tomorrowStart, tomorrowCutoff, busySlots);
    remainingMinutes = fillGaps(gaps, remainingMinutes, newBlocks);
  }

  return {
    blocksToDelete,
    newBlocks,
    // remainingMinutes can be a partial block (≥ MIN but < BLOCK); ceil ensures
    // that any unplaceable fragment is counted as at least one dropped block.
    droppedCount: remainingMinutes >= MIN_BLOCK_MINUTES
      ? Math.ceil(remainingMinutes / BLOCK_DURATION_MINUTES)
      : 0,
  };
}
