import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset, CardShadow } from '@/constants/theme';
import { useTasks } from '@/lib/tasks';
import { useHabits } from '@/lib/habits';
import { useFocusWeekSummary } from '@/lib/focus-blocks';
import { useSleepSummary } from '@/hooks/use-sleep-sync';
import type { SleepQuality } from '@/types/sleep';

function formatHours(h: number): string {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

function qualityColor(quality: SleepQuality, accent: string): string {
  if (quality === 'POOR') return '#EF4444';
  if (quality === 'FAIR') return '#F59E0B';
  return accent;
}

function qualityLabel(quality: SleepQuality): string {
  if (quality === 'POOR') return 'Poor';
  if (quality === 'FAIR') return 'Fair';
  return 'Good';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useHabits();
  const { data: focusSummary } = useFocusWeekSummary();
  const sleepSummary = useSleepSummary();

  const today = todayMidnight();

  const tasksDueTodayCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'DONE') return false;
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return isSameDay(d, today);
  }).length;

  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'DONE') return false;
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }).length;

  const habitsTotal = habits.length;
  const habitsDone = habits.filter((h) => h.completedToday).length;
  const habitsAllDone = habitsTotal > 0 && habitsDone === habitsTotal;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.greetingLabel, { color: theme.textSecondary }]}>
              {greeting()}
            </Text>
            <ThemedText type="title">Dashboard</ThemedText>
          </View>

          <View style={styles.cards}>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                CardShadow,
              ]}>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                TASKS DUE TODAY
              </Text>
              <Text style={[styles.cardNumber, { color: theme.text }]}>
                {tasksDueTodayCount}
              </Text>
              {overdueCount > 0 ? (
                <Text style={styles.overdueNote}>{overdueCount} overdue</Text>
              ) : (
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                  {tasksDueTodayCount === 0 ? 'Nothing due' : 'On track'}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                CardShadow,
              ]}>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                HABITS TODAY
              </Text>
              <Text style={[styles.cardNumber, { color: habitsAllDone ? theme.accent : theme.text }]}>
                {habitsDone}/{habitsTotal}
              </Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                {habitsTotal === 0
                  ? 'No habits yet'
                  : habitsAllDone
                  ? 'All done!'
                  : `${habitsTotal - habitsDone} remaining`}
              </Text>
            </View>

            {focusSummary !== undefined && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  CardShadow,
                ]}>
                <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                  FOCUS THIS WEEK
                </Text>
                <Text style={[styles.cardNumber, { color: theme.text }]}>
                  {formatHours(focusSummary.scheduledHours)}
                </Text>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                  {`of ${focusSummary.targetHours}h target · ${formatHours(focusSummary.elapsedHours)} elapsed`}
                </Text>
                {focusSummary.shortfallHours >= 0.1 ? (
                  <Text style={styles.shortfallNote}>
                    {`${formatHours(focusSummary.shortfallHours)} shortfall — not enough slots`}
                  </Text>
                ) : focusSummary.scheduledHours > 0 ? (
                  <Text style={[styles.cardSub, { color: theme.accent }]}>On track</Text>
                ) : (
                  <Text style={[styles.cardSub, { color: theme.textSecondary }]}>No blocks scheduled</Text>
                )}
              </View>
            )}

            {sleepSummary !== undefined && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  CardShadow,
                ]}>
                <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                  LAST NIGHT
                </Text>
                {sleepSummary === null ? (
                  <Text style={[styles.cardSub, { color: theme.textSecondary }]}>No sleep data</Text>
                ) : (
                  <>
                    <Text style={[styles.cardNumber, { color: qualityColor(sleepSummary.quality, theme.accent) }]}>
                      {sleepSummary.durationHours.toFixed(1)}h
                    </Text>
                    <Text style={[styles.cardSub, { color: qualityColor(sleepSummary.quality, theme.accent) }]}>
                      {qualityLabel(sleepSummary.quality)}
                    </Text>
                    {sleepSummary.rescheduledCount > 0 && (
                      <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                        {`${sleepSummary.rescheduledCount} block${sleepSummary.rescheduledCount === 1 ? '' : 's'} rescheduled to afternoon`}
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cards: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardNumber: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -1,
  },
  cardSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  overdueNote: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
  shortfallNote: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
  },
});
