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

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? Appearance.getColorScheme() ?? 'light';
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }, [scheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <AnimatedSplashOverlay />
          <AppTabs />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
