import * as Notifications from 'expo-notifications';
import type { Task } from '@/types/task';

const TASK_NOTIF_PREFIX = 'task-';
const FOCUS_NOTIF_PREFIX = 'focus-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: next } = await Notifications.requestPermissionsAsync();
  return next === 'granted';
}

// Cancel all existing task notifications then reschedule from the current task list.
// Fires day-before at 20:00 and day-of at 08:00 for every pending task with a due date.
export async function scheduleTaskReminders(tasks: Task[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(TASK_NOTIF_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const now = new Date();

  for (const task of tasks) {
    if (!task.dueDate || task.status === 'DONE') continue;
    const [y, m, d] = task.dueDate.split('-').map(Number);
    const dueMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);

    const dayBefore = new Date(dueMidnight);
    dayBefore.setDate(dueMidnight.getDate() - 1);
    dayBefore.setHours(20, 0, 0, 0);

    const dayOf = new Date(dueMidnight);
    dayOf.setHours(8, 0, 0, 0);

    if (dayBefore > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${TASK_NOTIF_PREFIX}${task.id}-before`,
        content: { title: 'Due tomorrow', body: task.title },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dayBefore,
        },
      });
    }

    if (dayOf > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${TASK_NOTIF_PREFIX}${task.id}-today`,
        content: { title: 'Due today', body: task.title },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dayOf,
        },
      });
    }
  }
}

// Schedule a 15-min pre-alert for a focus block. No-op if the alert time has already passed.
export async function scheduleFocusBlockAlert(startTime: string, title: string): Promise<void> {
  const alertTime = new Date(new Date(startTime).getTime() - 15 * 60 * 1000);
  if (alertTime <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `${FOCUS_NOTIF_PREFIX}${startTime}`,
    content: {
      title: 'Focus block starting soon',
      body: `${title} starts in 15 minutes`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertTime,
    },
  });
}
