import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/lib/goals';
import { AddGoal } from '@/components/goal-add';
import { GoalItem } from '@/components/goal-item';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';
import type { Goal, UpdateGoalPayload } from '@/types/goal';
import type { Priority } from '@/types/task';

export default function GoalsScreen() {
  const theme = useTheme();
  const { data: goals = [], isLoading, isError } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  function handleAdd(title: string, priority: Priority, targetDate: string | null) {
    createGoal.mutate({ title, priority, targetDate });
  }

  function handleUpdate(id: string, payload: UpdateGoalPayload) {
    updateGoal.mutate({ id, payload });
  }

  function handleDelete(id: string) {
    deleteGoal.mutate(id);
  }

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
  const abandonedGoals = goals.filter((g) => g.status === 'ABANDONED');

  type Section = { title: string; data: Goal[] };
  const sections: Section[] = [
    { title: 'Active', data: activeGoals },
    { title: 'Completed', data: completedGoals },
    { title: 'Abandoned', data: abandonedGoals },
  ].filter((s) => s.data.length > 0);

  type ListItem =
    | { type: 'add' }
    | { type: 'header'; title: string }
    | { type: 'goal'; goal: Goal }
    | { type: 'empty' };

  const listItems: ListItem[] = [{ type: 'add' }];
  for (const section of sections) {
    listItems.push({ type: 'header', title: section.title });
    for (const goal of section.data) {
      listItems.push({ type: 'goal', goal });
    }
  }

  if (sections.length === 0) {
    listItems.push({ type: 'empty' });
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Goals</ThemedText>
        </View>
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}
        {isError && (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>Failed to load goals</Text>
          </View>
        )}
        {!isLoading && !isError && (
          <FlatList
            data={listItems}
            keyExtractor={(item) => {
              if (item.type === 'goal') return item.goal.id;
              if (item.type === 'header') return `header-${item.title}`;
              return item.type;
            }}
            renderItem={({ item }) => {
              if (item.type === 'add') {
                return <AddGoal onAdd={handleAdd} />;
              }
              if (item.type === 'empty') {
                return (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      No goals yet. Add one above.
                    </Text>
                  </View>
                );
              }
              if (item.type === 'header') {
                return (
                  <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                    {item.title}
                  </Text>
                );
              }
              return (
                <GoalItem
                  goal={item.goal}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              );
            }}
            contentContainerStyle={{ paddingTop: Spacing.two, paddingBottom: BottomTabInset + Spacing.three }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  emptyContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
