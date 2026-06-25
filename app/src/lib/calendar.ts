import * as Calendar from 'expo-calendar';
import * as SecureStore from 'expo-secure-store';

export interface SyncCalendarEvent {
  startTime: string; // ISO 8601 UTC
  endTime: string;
}

export interface FocusBlockToWrite {
  calendarMarker: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;
  title: string;
}

export const SOURCE_CALENDAR_IDS_KEY = 'source_calendar_ids';

export type CalendarItem = Awaited<ReturnType<typeof Calendar.getCalendarsAsync>>[number];

export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getCalendarPermissionStatus(): Promise<Calendar.PermissionResponse['status']> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status;
}

export async function getAllCalendars(): Promise<CalendarItem[]> {
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

export async function createFocusCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const localCal = calendars.find((c) => c.source?.type === Calendar.SourceType.LOCAL);
  const source = localCal?.source ?? calendars[0]?.source;

  return Calendar.createCalendarAsync({
    title: 'AI Focus Blocks',
    color: '#6366F1',
    entityType: Calendar.EntityTypes.EVENT,
    ...(source ? { source, sourceId: source.id } : {}),
    name: 'aiFocusBlocks',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

export async function getSourceCalendarIds(): Promise<string[]> {
  const stored = await SecureStore.getItemAsync(SOURCE_CALENDAR_IDS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export async function setSourceCalendarIds(ids: string[]): Promise<void> {
  await SecureStore.setItemAsync(SOURCE_CALENDAR_IDS_KEY, JSON.stringify(ids));
}

export async function readWeekEvents(
  sourceCalendarIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<SyncCalendarEvent[]> {
  if (sourceCalendarIds.length === 0) return [];
  const events = await Calendar.getEventsAsync(sourceCalendarIds, startDate, endDate);
  return events
    .filter((e) => e.startDate != null && e.endDate != null)
    .map((e) => ({
      startTime: new Date(e.startDate).toISOString(),
      endTime: new Date(e.endDate).toISOString(),
    }));
}

export async function writeFocusBlock(
  targetCalendarId: string,
  block: FocusBlockToWrite,
): Promise<string> {
  return Calendar.createEventAsync(targetCalendarId, {
    title: block.title,
    startDate: new Date(block.startTime),
    endDate: new Date(block.endTime),
    notes: block.calendarMarker,
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await Calendar.deleteEventAsync(eventId);
}
