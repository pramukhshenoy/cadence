import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { HabitItem } from '@/components/habit-item';
import { AddHabit } from '@/components/habit-add';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useHabits, useCreateHabit, useCompleteHabit, useUncompleteHabit, useDeleteHabit } from '@/lib/habits';
import type { Frequency } from '@/types/habit';

export default function HabitsScreen() {
  const theme = useTheme();
  const { data: habits = [], isLoading, isError } = useHabits();
  const createHabit = useCreateHabit();
  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();
  const deleteHabit = useDeleteHabit();

  const doneCount = useMemo(
    () => habits.filter((h) => h.completedToday).length,
    [habits],
  );

  const handleAdd = useCallback(
    (name: string, frequency: Frequency, weeklyTargetDays?: number[]) => {
      createHabit.mutate({ name, frequency, weeklyTargetDays });
    },
    [createHabit],
  );

  const handleToggle = useCallback(
    (id: string, completedToday: boolean) => {
      if (completedToday) {
        uncompleteHabit.mutate(id);
      } else {
        completeHabit.mutate(id);
      }
    },
    [completeHabit, uncompleteHabit],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteHabit.mutate(id);
    },
    [deleteHabit],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Habits</ThemedText>
          {habits.length > 0 && (
            <Text style={[styles.count, { color: theme.textSecondary }]}>
              {doneCount}/{habits.length}
            </Text>
          )}
        </View>

        <AddHabit onAdd={handleAdd} />

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={[styles.messageText, { color: theme.textSecondary }]}>
              Could not load habits.
            </Text>
          </View>
        ) : (
          <FlatList
            data={habits}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.messageText, { color: theme.textSecondary }]}>
                  No habits yet.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <HabitItem habit={item} onToggle={handleToggle} onDelete={handleDelete} />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  count: {
    fontSize: 20,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: Spacing.six,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
