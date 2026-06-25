export type SleepQuality = 'POOR' | 'FAIR' | 'GOOD';

export type SleepSummary = {
  localDate: string;
  durationHours: number;
  quality: SleepQuality;
  deepSleepHours: number | null;
  remSleepHours: number | null;
  sessionCount: number;
  rescheduledCount: number;
};
