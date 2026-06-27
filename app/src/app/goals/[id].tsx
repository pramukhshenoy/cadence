import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoals, useUpdateGoal } from '@/lib/goals';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/tasks';
import { useHabits } from '@/lib/habits';
import { AddTask } from '@/components/task-add';
import { TaskItem } from '@/components/task-item';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';
import type { Priority, UpdateTaskPayload } from '@/types/task';

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();

  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: habits = [] } = useHabits();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateGoal = useUpdateGoal();

  const goal = goals.find((g) => g.id === id);
  const goalTasks = allTasks.filter((t) => t.goalId === id);
  const linkedHabit = goal?.linkedHabitId ? habits.find((h) => h.id === goal.linkedHabitId) : null;

  const [showCompleted, setShowCompleted] = useState(false);
  const visibleTasks = showCompleted ? goalTasks : goalTasks.filter((t) => t.status !== 'DONE');

  function handleAddTask(title: string, priority: Priority, dueDate: string | null) {
    createTask.mutate({ title, priority, dueDate, goalId: id ?? null });
  }

  function handleUpdateTask(taskId: string, payload: UpdateTaskPayload) {
    updateTask.mutate({ id: taskId, payload });
  }

  function handleDeleteTask(taskId: string) {
    deleteTask.mutate(taskId);
  }

  if (goalsLoading || tasksLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Goal not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: theme.accent }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  type ListItem =
    | { type: 'header' }
    | { type: 'addTask' }
    | { type: 'taskSectionLabel' }
    | { type: 'task'; taskId: string }
    | { type: 'showCompleted' };

  const items: ListItem[] = [
    { type: 'header' },
    { type: 'addTask' },
    { type: 'taskSectionLabel' },
    ...visibleTasks.map((t): ListItem => ({ type: 'task', taskId: t.id })),
  ];

  const hasCompleted = goalTasks.some((t) => t.status === 'DONE');
  if (hasCompleted) {
    items.push({ type: 'showCompleted' });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backBtnLabel, { color: theme.accent }]}>← Goals</Text>
        </Pressable>
      </SafeAreaView>
      <FlatList
        data={items}
        keyExtractor={(item, index) => {
          if (item.type === 'task') return item.taskId;
          return `${item.type}-${index}`;
        }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={[styles.goalHeader, { borderBottomColor: theme.border }]}>
                <View style={styles.goalTitleRow}>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[goal.priority] }]} />
                  <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                </View>
                {goal.description && (
                  <Text style={[styles.goalDescription, { color: theme.textSecondary }]}>
                    {goal.description}
                  </Text>
                )}
                <View style={styles.progressSection}>
                  <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { backgroundColor: theme.accent, width: `${goal.progressPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      {goal.doneTasks}/{goal.totalTasks} tasks ({goal.progressPercent}%)
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    {goal.targetDate && (
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        Target: {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    )}
                    {goal.velocityCount > 0 && (
                      <Text style={[styles.metaText, { color: '#22C55E' }]}>
                        +{goal.velocityCount} completed this week
                      </Text>
                    )}
                    {linkedHabit && (
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        Habit: {linkedHabit.name} · {linkedHabit.streak > 0 ? `${linkedHabit.streak} day streak` : 'No streak'}
                      </Text>
                    )}
                  </View>
                </View>
                {goal.status !== 'ACTIVE' && (
                  <Pressable
                    style={[styles.reopenBtn, { borderColor: theme.accent }]}
                    onPress={() => updateGoal.mutate({ id: goal.id, payload: { status: 'ACTIVE' } })}>
                    <Text style={[styles.reopenBtnLabel, { color: theme.accent }]}>Reopen Goal</Text>
                  </Pressable>
                )}
              </View>
            );
          }

          if (item.type === 'addTask') {
            if (goal.status !== 'ACTIVE') return null;
            return <AddTask onAdd={handleAddTask} goalId={id} />;
          }

          if (item.type === 'taskSectionLabel') {
            return (
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                Tasks {goalTasks.length === 0 ? '— none yet' : ''}
              </Text>
            );
          }

          if (item.type === 'task') {
            const task = allTasks.find((t) => t.id === item.taskId);
            if (!task) return null;
            return (
              <TaskItem
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            );
          }

          if (item.type === 'showCompleted') {
            const doneCount = goalTasks.filter((t) => t.status === 'DONE').length;
            return (
              <Pressable
                style={styles.showCompletedBtn}
                onPress={() => setShowCompleted((v) => !v)}>
                <Text style={[styles.showCompletedLabel, { color: theme.accent }]}>
                  {showCompleted ? 'Hide completed' : `Show ${doneCount} completed`}
                </Text>
              </Pressable>
            );
          }

          return null;
        }}
        contentContainerStyle={{ paddingTop: Spacing.three, paddingBottom: BottomTabInset + Spacing.three }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  errorText: { fontSize: 15 },
  backLink: { fontSize: 15, fontWeight: '600' },
  backBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  backBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  goalHeader: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
    marginTop: 5,
  },
  goalTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  goalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressSection: {
    gap: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 0,
  },
  metaRow: {
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  reopenBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: 'flex-start',
  },
  reopenBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  showCompletedBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  showCompletedLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
