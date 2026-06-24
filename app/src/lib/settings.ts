import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api-client';

export type ModelOption = { id: string; label: string };
export type AppSettings = { preferredModel: string; targetCalendarId: string | null };

export const MODELS_QUERY_KEY = ['chat-models'] as const;
export const SETTINGS_QUERY_KEY = ['app-settings'] as const;

export function useChatModels() {
  return useQuery<ModelOption[]>({
    queryKey: MODELS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiFetch('/api/chat/models');
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = (await res.json()) as { models: ModelOption[] };
      return data.models;
    },
  });
}

export function useAppSettings() {
  return useQuery<AppSettings>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json() as Promise<AppSettings>;
    },
  });
}

export function useUpdatePreferredModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (preferredModel: string): Promise<void> => {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ preferredModel }),
      });
      if (!res.ok) throw new Error('Failed to save model preference');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  });
}

export function useUpdateTargetCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetCalendarId: string): Promise<void> => {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ targetCalendarId }),
      });
      if (!res.ok) throw new Error('Failed to save calendar selection');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  });
}
