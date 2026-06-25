import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, CardShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  DEFAULT_API_URL,
  deleteApiToken,
  getApiBaseUrl,
  getApiToken,
  setApiBaseUrl,
  setApiToken,
} from '@/lib/api-client';
import { useChatModels, useAppSettings, useUpdatePreferredModel, useUpdateSleepSettings } from '@/lib/settings';

type SaveState = 'idle' | 'saving' | 'saved';

export default function SettingsScreen() {
  const theme = useTheme();

  const [url, setUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState('');
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const { data: models, isLoading: modelsLoading } = useChatModels();
  const { data: appSettings, isLoading: settingsLoading } = useAppSettings();
  const updateModel = useUpdatePreferredModel();
  const updateSleepSettings = useUpdateSleepSettings();
  const [selectedModel, setSelectedModel] = useState<string>('');

  const [sleepThreshold, setSleepThreshold] = useState('');
  const [goodThreshold, setGoodThreshold] = useState('');
  const [morningCutoff, setMorningCutoff] = useState('');
  const sleepInitialized = useRef(false);

  useEffect(() => {
    getApiBaseUrl()
      .then(setUrl)
      .catch(() => {});
    getApiToken()
      .then((t) => {
        setTokenLoaded(true);
        if (t) setToken(t);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (appSettings?.preferredModel && !selectedModel) {
      setSelectedModel(appSettings.preferredModel);
    }
  }, [appSettings?.preferredModel, selectedModel]);

  useEffect(() => {
    if (appSettings && !sleepInitialized.current) {
      sleepInitialized.current = true;
      setSleepThreshold(String(appSettings.sleepThresholdHours));
      setGoodThreshold(String(appSettings.goodThresholdHours));
      setMorningCutoff(String(appSettings.morningCutoffHour));
    }
  }, [appSettings]);

  async function handleSave() {
    if (saveState === 'saving') return;
    const parsedThreshold = parseFloat(sleepThreshold);
    const parsedGood = parseFloat(goodThreshold);
    const parsedCutoff = parseInt(morningCutoff, 10);
    const hasInvalidSleepField =
      (sleepThreshold !== '' && isNaN(parsedThreshold)) ||
      (goodThreshold !== '' && isNaN(parsedGood)) ||
      (morningCutoff !== '' && isNaN(parsedCutoff));
    if (hasInvalidSleepField) {
      Alert.alert('Invalid sleep values', 'Sleep threshold hours must be valid numbers.');
      return;
    }
    const validThreshold = !isNaN(parsedThreshold);
    const validGood = !isNaN(parsedGood);
    if (validThreshold && validGood && parsedThreshold >= parsedGood) {
      Alert.alert('Invalid sleep values', 'Poor sleep threshold must be less than good sleep threshold.');
      return;
    }
    setSaveState('saving');
    try {
      await setApiBaseUrl(url.trim() || DEFAULT_API_URL);
      const trimmedToken = token.trim();
      if (trimmedToken) {
        await setApiToken(trimmedToken);
      } else if (tokenLoaded) {
        await deleteApiToken();
      }
      if (selectedModel) {
        await updateModel.mutateAsync(selectedModel);
      }
      const sleepValues: { sleepThresholdHours?: number; goodThresholdHours?: number; morningCutoffHour?: number } = {};
      if (validThreshold) sleepValues.sleepThresholdHours = parsedThreshold;
      if (validGood) sleepValues.goodThresholdHours = parsedGood;
      if (!isNaN(parsedCutoff)) sleepValues.morningCutoffHour = parsedCutoff;
      if (Object.keys(sleepValues).length > 0) {
        await updateSleepSettings.mutateAsync(sleepValues);
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('idle');
      Alert.alert('Save failed', 'Could not save settings. Please try again.');
    }
  }

  const isSaveDisabled = saveState === 'saving' || settingsLoading || modelsLoading;
  const buttonLabel = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Settings</ThemedText>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CONNECTION</Text>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, CardShadow]}>
              <View style={styles.fieldInCard}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Server URL</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={url}
                  onChangeText={setUrl}
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
                  onChangeText={setToken}
                  placeholder="Enter bearer token"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {models && models.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>AI MODEL</Text>
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, CardShadow]}>
                {models.map((model, index) => {
                  const isSelected = selectedModel === model.id;
                  const isLast = index === models.length - 1;
                  return (
                    <View key={model.id}>
                      <Pressable
                        onPress={() => setSelectedModel(model.id)}
                        style={({ pressed }) => [styles.modelRow, pressed && { opacity: 0.7 }]}>
                        <View style={styles.modelInfo}>
                          <Text style={[styles.modelLabel, { color: theme.text }, isSelected && { fontWeight: '600', color: theme.accent }]}>
                            {model.label}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.radioOuter,
                            { borderColor: isSelected ? theme.accent : theme.border },
                          ]}>
                          {isSelected && (
                            <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />
                          )}
                        </View>
                      </Pressable>
                      {!isLast && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CALENDAR</Text>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, CardShadow]}>
              <Pressable
                onPress={() => router.push('/calendar-setup')}
                style={({ pressed }) => [styles.calendarRow, pressed && { opacity: 0.7 }]}>
                <View style={styles.calendarRowContent}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Focus Block Calendar</Text>
                  <Text style={[styles.calendarHint, { color: theme.textSecondary }]}>
                    {appSettings?.targetCalendarId ? 'Configured ✓' : 'Not set up yet'}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>SLEEP</Text>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, CardShadow]}>
              <View style={styles.fieldInCard}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Poor sleep threshold (hours)</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={sleepThreshold}
                  onChangeText={setSleepThreshold}
                  placeholder="6.5"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.fieldInCard}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Good sleep threshold (hours)</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={goodThreshold}
                  onChangeText={setGoodThreshold}
                  placeholder="7.0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.fieldInCard}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Morning cutoff hour (24h)</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={morningCutoff}
                  onChangeText={setMorningCutoff}
                  placeholder="10"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <Pressable
            disabled={isSaveDisabled}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.accent },
              isSaveDisabled && styles.saveButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSave}>
            <Text style={[styles.saveButtonLabel, { color: theme.accentForeground }]}>
              {buttonLabel}
            </Text>
          </Pressable>
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
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.one,
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
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 6,
  },
  modelInfo: {
    flex: 1,
  },
  modelLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  saveButton: {
    paddingVertical: Spacing.two + 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 6,
  },
  calendarRowContent: { flex: 1 },
  calendarHint: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20, fontWeight: '300' },
});
