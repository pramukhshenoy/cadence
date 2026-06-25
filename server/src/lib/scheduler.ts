import { randomUUID } from 'crypto';

export interface CalendarEvent {
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
}

export interface FocusBlockResult {
  calendarMarker: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  title: string;
}

export interface SchedulerInput {
  events: CalendarEvent[];
  timezone: string;
  settings: {
    focusHoursPerWeek: number;
    workdayStartHour: number;
    workdayEndHour: number;
    includeWeekends: boolean;
  };
  now?: Date;
}

export interface SchedulerResult {
  focusBlocks: FocusBlockResult[];
  scheduledHours: number;
  requestedHours: number;
  shortfallHours: number;
}

export const MIN_BLOCK_MINUTES = 30;
export const BLOCK_DURATION_MINUTES = 60;

export function utcToLocalDateStr(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function utcToLocalHour(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  return parseInt(h) % 24;
}

// Convert a local date (YYYY-MM-DD) + hour + minute to UTC.
// Uses the "pivot" method: treat local time as UTC, then measure the offset
// between pivot's actual local time and the target, and correct.
export function localTimeToUtc(dateStr: string, hour: number, minute: number, tz: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const pivot = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(pivot);

  const hourPart = parts.find(p => p.type === 'hour');
  const minutePart = parts.find(p => p.type === 'minute');
  const localH = hourPart ? (parseInt(hourPart.value) % 24) : 0;
  const localM = minutePart ? parseInt(minutePart.value) : 0;

  const errorMin = localH * 60 + localM - (hour * 60 + minute);
  return new Date(pivot.getTime() - errorMin * 60 * 1000);
}

export function getIsoWeekDates(now: Date, tz: string): string[] {
  const localDate = utcToLocalDateStr(now, tz);
  const [year, month, day] = localDate.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dow = d.getUTCDay(); // 0=Sun
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d.getTime() - daysToMonday * 86400000);

  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getTime() + i * 86400000).toISOString().slice(0, 10),
  );
}

export function scheduleBlocks(input: SchedulerInput): SchedulerResult {
  const { events, timezone, settings, now = new Date() } = input;
  const { focusHoursPerWeek, workdayStartHour, workdayEndHour, includeWeekends } = settings;

  const weekDates = getIsoWeekDates(now, timezone);
  const todayStr = utcToLocalDateStr(now, timezone);

  const eligibleDates = weekDates.filter(dateStr => {
    if (dateStr < todayStr) return false;
    const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay(); // 0=Sun, 6=Sat
    if (!includeWeekends && (dow === 0 || dow === 6)) return false;
    return true;
  });

  const parsedEvents = events
    .map(e => ({ start: new Date(e.startTime), end: new Date(e.endTime) }))
    .filter(e => !isNaN(e.start.getTime()) && !isNaN(e.end.getTime()) && e.end > e.start);

  const focusBlocks: FocusBlockResult[] = [];
  let remainingMinutes = focusHoursPerWeek * 60;

  for (const dateStr of eligibleDates) {
    if (remainingMinutes < MIN_BLOCK_MINUTES) break;

    let workStart = localTimeToUtc(dateStr, workdayStartHour, 0, timezone);
    const workEnd = localTimeToUtc(dateStr, workdayEndHour, 0, timezone);

    // On today, don't schedule in the past — round up to next 30-min boundary
    if (dateStr === todayStr && now > workStart) {
      const roundedMs = Math.ceil(now.getTime() / (MIN_BLOCK_MINUTES * 60 * 1000)) * MIN_BLOCK_MINUTES * 60 * 1000;
      workStart = new Date(roundedMs);
    }

    if (workStart >= workEnd) continue;

    // Events overlapping this workday window, sorted by start
    const dayEvents = parsedEvents
      .filter(e => e.end > workStart && e.start < workEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Collect free gaps within the workday
    let cursor = workStart;
    const gaps: Array<{ start: Date; end: Date }> = [];

    for (const e of dayEvents) {
      const occStart = e.start < workStart ? workStart : e.start;
      const occEnd = e.end > workEnd ? workEnd : e.end;
      if (occStart > cursor) {
        gaps.push({ start: cursor, end: occStart });
      }
      if (occEnd > cursor) cursor = occEnd;
    }
    if (cursor < workEnd) {
      gaps.push({ start: cursor, end: workEnd });
    }

    // Place blocks greedily in each gap
    for (const gap of gaps) {
      if (remainingMinutes < MIN_BLOCK_MINUTES) break;
      let gapCursor = gap.start;

      while (remainingMinutes >= MIN_BLOCK_MINUTES) {
        const availableMin = (gap.end.getTime() - gapCursor.getTime()) / 60000;
        if (availableMin < MIN_BLOCK_MINUTES) break;

        const blockMin = Math.min(BLOCK_DURATION_MINUTES, availableMin, remainingMinutes);
        const blockEnd = new Date(gapCursor.getTime() + blockMin * 60000);
        focusBlocks.push({
          calendarMarker: randomUUID(),
          startTime: gapCursor.toISOString(),
          endTime: blockEnd.toISOString(),
          title: 'Focus Block',
        });

        remainingMinutes -= blockMin;
        gapCursor = blockEnd;
      }
    }
  }

  const scheduledHours = (focusHoursPerWeek * 60 - remainingMinutes) / 60;
  const shortfallHours = Math.max(0, focusHoursPerWeek - scheduledHours);

  return {
    focusBlocks,
    scheduledHours: Math.round(scheduledHours * 100) / 100,
    requestedHours: focusHoursPerWeek,
    shortfallHours: Math.round(shortfallHours * 100) / 100,
  };
}
