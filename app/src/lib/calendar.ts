import * as Calendar from 'expo-calendar';
import * as SecureStore from 'expo-secure-store';

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
