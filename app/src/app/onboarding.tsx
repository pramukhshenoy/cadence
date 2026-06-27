import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_API_URL, setApiBaseUrl, setApiToken } from '@/lib/api-client';
import { requestCalendarPermissions } from '@/lib/calendar';
import { initHealthConnect, requestSleepPermission } from '@/lib/health-connect';
import { setOnboardingComplete } from '@/lib/onboarding';

type Step = 'welcome' | 'connection' | 'calendar' | 'health' | 'done';

export default function OnboardingScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('welcome');

  const [url, setUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectionOk, setConnectionOk] = useState(false);

  async function testConnection() {
    if (testing) return;
    setTesting(true);
    setConnectionOk(false);
    try {
      const trimmedUrl = url.trim() || DEFAULT_API_URL;
      await setApiBaseUrl(trimmedUrl);
      if (token.trim()) await setApiToken(token.trim());
      const res = await fetch(`${trimmedUrl}/health`);
      if (res.ok) {
        setConnectionOk(true);
      } else {
        Alert.alert('Connection failed', 'Server returned an error. Check your URL and bearer token.');
      }
    } catch {
      Alert.alert('Connection failed', 'Could not reach the server. Make sure your backend is running.');
    } finally {
      setTesting(false);
    }
  }

  async function handleCalendarSetup() {
    const granted = await requestCalendarPermissions();
    if (granted) {
      router.push('/calendar-setup');
    } else {
      Alert.alert('Permission denied', 'You can enable calendar access later from Settings → Calendar.');
    }
  }

  async function handleHealthConnect() {
    try {
      const initialized = await initHealthConnect();
      if (!initialized) {
        Alert.alert(
          'Health Connect unavailable',
          'Install Health Connect from the Play Store to enable sleep tracking. You can set this up later.',
          [{ text: 'OK', onPress: () => setStep('done') }],
        );
        return;
      }
      await requestSleepPermission();
      setStep('done');
    } catch {
      setStep('done');
    }
  }

  async function handleFinish() {
    await setOnboardingComplete();
    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">

          {step === 'welcome' && (
            <>
              <View style={styles.iconWrap}>
                <Text style={[styles.iconGlyph, { color: theme.accent }]}>◈</Text>
              </View>
              <ThemedText type="title">Welcome to Cadence</ThemedText>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Your AI-powered assistant for tasks, habits, focus blocks, and sleep-aware scheduling.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={() => setStep('connection')}>
                <Text style={[styles.primaryBtnLabel, { color: theme.accentForeground }]}>
                  Get Started
                </Text>
              </Pressable>
            </>
          )}

          {step === 'connection' && (
            <>
              <ThemedText type="title">Connect to Backend</ThemedText>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Cadence needs a local backend server. Enter the URL and API bearer token.
              </Text>

              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  CardShadow,
                ]}>
                <View style={styles.fieldInCard}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Server URL</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={url}
                    onChangeText={(v) => { setUrl(v); setConnectionOk(false); }}
                    placeholder={DEFAULT_API_URL}
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.fieldInCard}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bearer Token</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={token}
                    onChangeText={(v) => { setToken(v); setConnectionOk(false); }}
                    placeholder="Enter bearer token"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Pressable
                onPress={testConnection}
                disabled={testing}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  { borderColor: connectionOk ? '#10B981' : theme.accent },
                  pressed && styles.pressed,
                ]}>
                {testing ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Text
                    style={[
                      styles.outlineBtnLabel,
                      { color: connectionOk ? '#10B981' : theme.accent },
                    ]}>
                    {connectionOk ? 'Connected ✓' : 'Test Connection'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                disabled={!connectionOk}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  !connectionOk && styles.disabledBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => setStep('calendar')}>
                <Text style={[styles.primaryBtnLabel, { color: theme.accentForeground }]}>
                  Next
                </Text>
              </Pressable>
            </>
          )}

          {step === 'calendar' && (
            <>
              <ThemedText type="title">Calendar Access</ThemedText>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Cadence can automatically schedule focus blocks in your calendar, working around existing events.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={handleCalendarSetup}>
                <Text style={[styles.primaryBtnLabel, { color: theme.accentForeground }]}>
                  Set Up Calendar
                </Text>
              </Pressable>

              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                After saving your calendar selection, press Continue below.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={() => setStep('health')}>
                <Text style={[styles.primaryBtnLabel, { color: theme.accentForeground }]}>
                  Continue
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
                onPress={() => setStep('health')}>
                <Text style={[styles.skipLabel, { color: theme.textSecondary }]}>
                  Skip for now
                </Text>
              </Pressable>
            </>
          )}

          {step === 'health' && (
            <>
              <ThemedText type="title">Sleep Tracking</ThemedText>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Cadence can read your sleep data from Health Connect to reschedule focus blocks after poor sleep.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={handleHealthConnect}>
                <Text style={[styles.primaryBtnLabel, { color: theme.accentForeground }]}>
                  Enable Sleep Tracking
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
                onPress={() => setStep('done')}>
                <Text style={[styles.skipLabel, { color: theme.textSecondary }]}>
                  Skip for now
                </Text>
              </Pressable>
            </>
          )}

          {step === 'done' && (
            <>
              <View style={styles.iconWrap}>
                <Text style={[styles.iconGlyph, { color: theme.accent }]}>✓</Text>
              </View>
              <ThemedText type="title">All set!</ThemedText>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Cadence is ready. You can adjust any settings anytime from the Settings tab.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={handleFinish}>
                <Text style={[styles.primaryBtnLabel, { color: theme.accentForeground }]}>
                  Go to App
                </Text>
              </Pressable>
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  iconGlyph: {
    fontSize: 56,
    lineHeight: 68,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fieldInCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.one + 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + 4,
    borderWidth: 1,
    borderRadius: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
  },
  primaryBtn: {
    paddingVertical: Spacing.two + 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  outlineBtn: {
    paddingVertical: Spacing.two + 6,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  outlineBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
});
