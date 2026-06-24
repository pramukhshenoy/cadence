import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api-client';
import type { Habit } from '@/types/habit';

export const HABITS_QUERY_KEY = ['habits'] as const;

export function useHabits() {
  return useQuery<Habit[]>({
    queryKey: HABITS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiFetch('/api/habits');
      if (!res.ok) throw new Error('Failed to fetch habits');
      return res.json() as Promise<Habit[]>;
    },
  });
}

function flipCompletedToday(habits: Habit[], id: string, value: boolean): Habit[] {
  return habits.map((h) => (h.id === id ? { ...h, completedToday: value } : h));
}

export function useCompleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/habits/${id}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to complete habit');
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: HABITS_QUERY_KEY });
      const prev = qc.getQueryData<Habit[]>(HABITS_QUERY_KEY);
      if (prev) qc.setQueryData<Habit[]>(HABITS_QUERY_KEY, flipCompletedToday(prev, id, true));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData<Habit[]>(HABITS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: HABITS_QUERY_KEY }),
  });
}

export function useUncompleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/habits/${id}/complete`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to uncomplete habit');
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: HABITS_QUERY_KEY });
      const prev = qc.getQueryData<Habit[]>(HABITS_QUERY_KEY);
      if (prev) qc.setQueryData<Habit[]>(HABITS_QUERY_KEY, flipCompletedToday(prev, id, false));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData<Habit[]>(HABITS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: HABITS_QUERY_KEY }),
  });
}
