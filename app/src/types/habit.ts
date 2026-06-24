export type Frequency = 'DAILY' | 'WEEKLY';

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  frequency: Frequency;
  weeklyTargetDays: string | null;
  completedToday: boolean;
  streak: number;
  createdAt: string;
  updatedAt: string;
}
