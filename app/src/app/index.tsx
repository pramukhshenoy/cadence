import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTasks } from '@/lib/tasks';
import { useHabits } from '@/lib/habits';

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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Dashboard
          </ThemedText>

          <View style={styles.cards}>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                TASKS DUE TODAY
              </Text>
              <Text style={[styles.cardNumber, { color: theme.text }]}>
                {tasksDueTodayCount}
              </Text>
              {overdueCount > 0 && (
                <Text style={styles.overdueNote}>{overdueCount} overdue</Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                HABITS TODAY
              </Text>
              <Text style={[styles.cardNumber, { color: theme.text }]}>
                {habitsDone}/{habitsTotal}
              </Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                {habitsTotal === 0
                  ? 'No habits'
                  : habitsDone === habitsTotal
                  ? 'All done!'
                  : `${habitsTotal - habitsDone} remaining`}
              </Text>
            </View>
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
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  title: {
    marginBottom: Spacing.one,
  },
  cards: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardNumber: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
  },
  cardSub: {
    fontSize: 13,
  },
  overdueNote: {
    fontSize: 13,
    color: '#ef4444',
  },
});
