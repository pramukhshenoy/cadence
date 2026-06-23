import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';
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

type SaveState = 'idle' | 'saving' | 'saved';

export default function SettingsScreen() {
  const theme = useTheme();
  const [url, setUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState('');
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    getApiBaseUrl()
      .then(setUrl)
      .catch(() => {});
    getApiToken()
      .then(t => {
        setTokenLoaded(true);
        if (t) setToken(t);
      })
      .catch(() => {});
  }, []);

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
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('idle');
      Alert.alert('Save failed', 'Could not save settings. Please try again.');
    }
  }

  const buttonLabel = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved!' : 'Save';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
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

        <Pressable
          disabled={saveState === 'saving'}
          style={[styles.saveButton, { backgroundColor: theme.text }]}
          onPress={handleSave}>
          <ThemedText style={{ color: theme.background }}>{buttonLabel}</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
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
  saveButton: {
    padding: Spacing.two,
    borderRadius: Spacing.one,
    alignItems: 'center',
  },
});
