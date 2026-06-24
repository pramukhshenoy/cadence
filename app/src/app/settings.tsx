import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  DEFAULT_API_URL,
  deleteApiToken,
  getApiBaseUrl,
  getApiToken,
  setApiBaseUrl,
  setApiToken,
} from '@/lib/api-client';
import { useChatModels, useAppSettings, useUpdatePreferredModel } from '@/lib/settings';

type SaveState = 'idle' | 'saving' | 'saved';

export default function SettingsScreen() {
  const theme = useTheme();

  // Connection settings (local SecureStore, no TanStack Query)
  const [url, setUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState('');
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Model preference (server-side, via TanStack Query)
  const { data: models, isLoading: modelsLoading } = useChatModels();
  const { data: appSettings, isLoading: settingsLoading } = useAppSettings();
  const updateModel = useUpdatePreferredModel();
  const [selectedModel, setSelectedModel] = useState<string>('');

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

  // Sync selectedModel with server once settings load
  useEffect(() => {
    if (appSettings?.preferredModel && !selectedModel) {
      setSelectedModel(appSettings.preferredModel);
    }
  }, [appSettings?.preferredModel, selectedModel]);

  async function handleSave() {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      await setApiBaseUrl(url.trim() || DEFAULT_API_URL);
      const trimmedToken = token.trim();
      if (trimmedToken) {
        await setApiToken(trimmedToken);
      } else if (tokenLoaded) {
        // Only delete if the initial load succeeded — avoids wiping a real
        // token when the initial SecureStore read failed silently.
        await deleteApiToken();
      }
      if (selectedModel) {
        await updateModel.mutateAsync(selectedModel);
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('idle');
      Alert.alert('Save failed', 'Could not save settings. Please try again.');
    }
  }

  const isSaveDisabled = saveState === 'saving' || settingsLoading || modelsLoading;
  const buttonLabel = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved!' : 'Save';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Settings</ThemedText>

          <ThemedView style={styles.field}>
            <ThemedText type="small">Server URL</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundElement }]}
              value={url}
              onChangeText={setUrl}
              placeholder={DEFAULT_API_URL}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="small">Bearer Token</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundElement }]}
              value={token}
              onChangeText={setToken}
              placeholder="Enter bearer token"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
          </ThemedView>

          {models && models.length > 0 && (
            <ThemedView style={styles.field}>
              <ThemedText type="small">AI Model</ThemedText>
              <View style={styles.modelList}>
                {models.map((model) => {
                  const isSelected = selectedModel === model.id;
                  return (
                    <Pressable
                      key={model.id}
                      onPress={() => setSelectedModel(model.id)}
                      style={[
                        styles.modelOption,
                        { borderColor: isSelected ? '#3c87f7' : theme.backgroundElement },
                        isSelected && styles.modelOptionSelected,
                      ]}
                    >
                      <ThemedText style={isSelected && styles.modelLabelSelected}>
                        {model.label}
                      </ThemedText>
                      {isSelected && (
                        <ThemedText style={styles.modelCheck}>✓</ThemedText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ThemedView>
          )}

          <Pressable
            disabled={isSaveDisabled}
            style={[styles.saveButton, { backgroundColor: theme.text }, isSaveDisabled && styles.saveButtonDisabled]}
            onPress={handleSave}>
            <ThemedText style={{ color: theme.background }}>{buttonLabel}</ThemedText>
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
    gap: Spacing.three,
  },
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    padding: Spacing.two,
    fontSize: 16,
    marginTop: Spacing.one,
  },
  modelList: {
    marginTop: Spacing.one,
    gap: Spacing.one,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Spacing.one,
    padding: Spacing.two,
  },
  modelOptionSelected: {
    borderWidth: 2,
  },
  modelLabelSelected: {
    fontWeight: '600',
  },
  modelCheck: {
    color: '#3c87f7',
    fontWeight: '700',
  },
  saveButton: {
    padding: Spacing.two,
    borderRadius: Spacing.one,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
});
