import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api-client';
import type { Goal, CreateGoalPayload, UpdateGoalPayload } from '@/types/goal';

export const GOALS_QUERY_KEY = ['goals'] as const;

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: GOALS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiFetch('/api/goals');
      if (!res.ok) throw new Error('Failed to fetch goals');
      return res.json() as Promise<Goal[]>;
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGoalPayload): Promise<Goal> => {
      const res = await apiFetch('/api/goals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      return res.json() as Promise<Goal>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateGoalPayload }): Promise<Goal> => {
      const res = await apiFetch(`/api/goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update goal');
      return res.json() as Promise<Goal>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete goal');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  });
}
