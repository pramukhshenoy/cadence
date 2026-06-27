import type { Priority } from '@/types/task';

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: GoalStatus;
  targetDate: string | null;
  linkedHabitId: string | null;
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
  velocityCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  title: string;
  priority: Priority;
  description?: string;
  targetDate?: string | null;
  linkedHabitId?: string | null;
  status?: GoalStatus;
}

export interface UpdateGoalPayload {
  title?: string;
  description?: string | null;
  priority?: Priority;
  status?: GoalStatus;
  targetDate?: string | null;
  linkedHabitId?: string | null;
}
