import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  CalendarItem,
  createFocusCalendar,
  getAllCalendars,
  getSourceCalendarIds,
  requestCalendarPermissions,
  setSourceCalendarIds,
} from '@/lib/calendar';
import { useUpdateTargetCalendar } from '@/lib/settings';

const FOCUS_CALENDAR_TITLE = 'AI Focus Blocks';

export default function CalendarSetupScreen() {
  const theme = useTheme();
  const updateTarget = useUpdateTargetCalendar();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [sourceIds, setSourceIds] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      const [all, savedSourceIds] = await Promise.all([getAllCalendars(), getSourceCalendarIds()]);
      setCalendars(all);
      setSourceIds(new Set(savedSourceIds));
      setLoading(false);
    }
    init().catch(() => setLoading(false));
  }, []);

  function toggleSource(id: string) {
    setSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCreateFocusCalendar() {
    try {
      const id = await createFocusCalendar();
      const all = await getAllCalendars();
      setCalendars(all);
      setTargetId(id);
    } catch {
      Alert.alert('Error', 'Could not create the AI Focus Blocks calendar.');
    }
  }

  async function handleSave() {
    if (!targetId) {
      Alert.alert('Select a target calendar', 'Choose a calendar where focus blocks will be written.');
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        setSourceCalendarIds(Array.from(sourceIds)),
        updateTarget.mutateAsync(targetId),
      ]);
      router.back();
    } catch {
      Alert.alert('Save failed', 'Could not save calendar settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (permissionDenied) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.deniedText}>
          Calendar access was denied. Enable it in your device Settings to use focus blocks.
        </ThemedText>
      </ThemedView>
    );
  }

  const writeableCalendars = calendars.filter((c) => c.allowsModifications);
  const hasFocusCalendar = calendars.some((c) => c.title === FOCUS_CALENDAR_TITLE);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Calendar Setup</ThemedText>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose which calendars to read for conflict detection, and where to write focus blocks.
          </Text>

          {/* Source calendars */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>READ CALENDARS</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Events from these calendars are used for conflict detection.
            </Text>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, CardShadow]}>
              {calendars.map((cal, idx) => {
                const checked = sourceIds.has(cal.id);
                const isLast = idx === calendars.length - 1;
                return (
                  <View key={cal.id}>
                    <Pressable
                      onPress={() => toggleSource(cal.id)}
                      style={({ pressed }) => [styles.calRow, pressed && { opacity: 0.7 }]}>
                      <View style={[styles.colorDot, { backgroundColor: cal.color ?? theme.accent }]} />
                      <View style={styles.calInfo}>
                        <Text style={[styles.calTitle, { color: theme.text }]}>{cal.title}</Text>
                        {cal.source?.name ? (
                          <Text style={[styles.calSource, { color: theme.textSecondary }]}>{cal.source.name}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.checkbox, { borderColor: checked ? theme.accent : theme.border }]}>
                        {checked && <View style={[styles.checkboxFill, { backgroundColor: theme.accent }]} />}
                      </View>
                    </Pressable>
                    {!isLast && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Target calendar */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>WRITE FOCUS BLOCKS TO</Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Focus blocks created by Cadence will appear in this calendar.
            </Text>

            {!hasFocusCalendar && (
              <Pressable
                onPress={handleCreateFocusCalendar}
                style={({ pressed }) => [
                  styles.createButton,
                  { borderColor: theme.accent },
                  pressed && { opacity: 0.7 },
                ]}>
                <Text style={[styles.createButtonLabel, { color: theme.accent }]}>
                  {`+ Create "AI Focus Blocks" calendar`}
                </Text>
              </Pressable>
            )}

            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, CardShadow]}>
              {writeableCalendars.map((cal, idx) => {
                const selected = targetId === cal.id;
                const isLast = idx === writeableCalendars.length - 1;
                return (
                  <View key={cal.id}>
                    <Pressable
                      onPress={() => setTargetId(cal.id)}
                      style={({ pressed }) => [styles.calRow, pressed && { opacity: 0.7 }]}>
                      <View style={[styles.colorDot, { backgroundColor: cal.color ?? theme.accent }]} />
                      <View style={styles.calInfo}>
                        <Text style={[styles.calTitle, { color: theme.text }]}>{cal.title}</Text>
                        {cal.source?.name ? (
                          <Text style={[styles.calSource, { color: theme.textSecondary }]}>{cal.source.name}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.radioOuter, { borderColor: selected ? theme.accent : theme.border }]}>
                        {selected && <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />}
                      </View>
                    </Pressable>
                    {!isLast && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  </View>
                );
              })}
              {writeableCalendars.length === 0 && (
                <View style={styles.calRow}>
                  <Text style={[styles.calTitle, { color: theme.textSecondary }]}>No writable calendars found.</Text>
                </View>
              )}
            </View>
          </View>

          <Pressable
            disabled={saving || !targetId}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.accent },
              (saving || !targetId) && styles.saveButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}>
            <Text style={[styles.saveButtonLabel, { color: theme.accentForeground }]}>
              {saving ? 'Saving…' : 'Save'}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  deniedText: { textAlign: 'center', fontSize: 15 },
  content: { padding: Spacing.four, gap: Spacing.four },
  subtitle: { fontSize: 14, lineHeight: 20 },
  section: { gap: Spacing.two },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: Spacing.one },
  hint: { fontSize: 13, lineHeight: 18, paddingHorizontal: Spacing.one },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.two + 4,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  calInfo: { flex: 1 },
  calTitle: { fontSize: 15, fontWeight: '500' },
  calSource: { fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxFill: { width: 12, height: 12, borderRadius: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three },
  createButton: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
  },
  createButtonLabel: { fontSize: 14, fontWeight: '600' },
  saveButton: { paddingVertical: Spacing.two + 6, borderRadius: 14, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
});
