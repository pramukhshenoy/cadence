import { useEffect, useState } from 'react';
import { useTasks } from '@/lib/tasks';
import { requestNotificationPermissions, scheduleTaskReminders } from '@/lib/notifications';

export function useNotificationSync() {
  const { data: tasks } = useTasks();
  const [permitted, setPermitted] = useState<boolean | null>(null);

  useEffect(() => {
    requestNotificationPermissions()
      .then(setPermitted)
      .catch(() => setPermitted(false));
  }, []);

  useEffect(() => {
    if (!permitted || !tasks) return;
    scheduleTaskReminders(tasks).catch((err: unknown) => {
      console.error('[NotificationSync]', err);
    });
  }, [permitted, tasks]);
}
