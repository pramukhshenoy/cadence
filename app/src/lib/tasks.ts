import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api-client';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '@/types/task';

export const TASKS_QUERY_KEY = ['tasks'] as const;

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiFetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json() as Promise<Task[]>;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload): Promise<Task> => {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json() as Promise<Task>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTaskPayload;
    }): Promise<Task> => {
      const res = await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json() as Promise<Task>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  });
}
