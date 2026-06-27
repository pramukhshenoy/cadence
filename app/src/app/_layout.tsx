import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { OfflineBanner } from '@/components/offline-banner';
import { ToastContainer } from '@/components/toast-container';
import { queryClient } from '@/lib/query-client';
import { getCalendarPermissionStatus, requestCalendarPermissions } from '@/lib/calendar';
import { isOnboardingComplete } from '@/lib/onboarding';
import { useCalendarSync } from '@/hooks/use-calendar-sync';
import { useSleepSync } from '@/hooks/use-sleep-sync';
import { useSleepReschedule } from '@/hooks/use-sleep-reschedule';
import { useNotificationSync } from '@/hooks/use-notification-sync';
import { useBackendHealth } from '@/hooks/use-backend-health';

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

function NotificationSyncTrigger() {
  useNotificationSync();
  return null;
}

function BackendHealthBanner() {
  const { isOnline } = useBackendHealth();
  return <OfflineBanner visible={!isOnline} />;
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

  useEffect(() => {
    isOnboardingComplete()
      .then((done) => {
        if (!done) router.replace('/onboarding');
      })
      .catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <CalendarSyncTrigger />
          <SleepSyncTrigger />
          <SleepRescheduleTrigger />
          <NotificationSyncTrigger />
          <StatusBar style="auto" />
          <AnimatedSplashOverlay />
          <AppTabs />
          <BackendHealthBanner />
          <ToastContainer />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
