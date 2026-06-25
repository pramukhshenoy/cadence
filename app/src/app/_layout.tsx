import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { queryClient } from '@/lib/query-client';
import { getCalendarPermissionStatus, requestCalendarPermissions } from '@/lib/calendar';
import { useCalendarSync } from '@/hooks/use-calendar-sync';
import { useSleepSync } from '@/hooks/use-sleep-sync';
import { useSleepReschedule } from '@/hooks/use-sleep-reschedule';

function CalendarSyncTrigger() {
  useCalendarSync();
  return null;
}

function SleepSyncTrigger() {
  useSleepSync();
  return null;
}

function SleepRescheduleTrigger() {
  useSleepReschedule();
  return null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? Appearance.getColorScheme() ?? 'light';
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }, [scheme]);

  useEffect(() => {
    getCalendarPermissionStatus().then((status) => {
      if (status === 'undetermined') {
        requestCalendarPermissions().catch(() => {});
      }
    }).catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <CalendarSyncTrigger />
          <SleepSyncTrigger />
          <SleepRescheduleTrigger />
          <StatusBar style="auto" />
          <AnimatedSplashOverlay />
          <AppTabs />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
