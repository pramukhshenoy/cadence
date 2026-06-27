import React, { useState, useCallback, useMemo } from 'react';
import {
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TaskItem } from '@/components/task-item';
import { AddTask } from '@/components/task-add';
import { FilterBar } from '@/components/filter-chips';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/tasks';
import type { Task, Priority, TaskStatus, UpdateTaskPayload } from '@/types/task';

type GroupBy = 'priority' | 'due-date';

const PRIORITY_ORDER: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: 'High Priority',
  MEDIUM: 'Medium Priority',
  LOW: 'Low Priority',
};

function buildPrioritySections(tasks: Task[]): SectionListData<Task>[] {
  return PRIORITY_ORDER.map((p) => ({
    title: PRIORITY_LABEL[p],
    priority: p,
    data: tasks.filter((t) => t.priority === p),
  })).filter((s) => s.data.length > 0);
}

function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDueDateSections(tasks: Task[]): SectionListData<Task>[] {
  const now = new Date();
  const todayStr = localISODate(now);
  const tomorrowStr = localISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const overdue: Task[] = [];
  const todayTasks: Task[] = [];
  const tomorrowTasks: Task[] = [];
  const upcoming: Task[] = [];
  const noDate: Task[] = [];
  const completed: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'DONE') {
      completed.push(task);
      continue;
    }
    if (!task.dueDate) {
      noDate.push(task);
      continue;
    }
    // Compare only the date portion (YYYY-MM-DD) to avoid UTC↔local conversion bugs
    const dateStr = task.dueDate.split('T')[0];
    if (dateStr < todayStr) {
      overdue.push(task);
    } else if (dateStr === todayStr) {
      todayTasks.push(task);
    } else if (dateStr === tomorrowStr) {
      tomorrowTasks.push(task);
    } else {
      upcoming.push(task);
    }
  }

  return [
    { title: 'Overdue', data: overdue },
    { title: 'Today', data: todayTasks },
    { title: 'Tomorrow', data: tomorrowTasks },
    { title: 'Upcoming', data: upcoming },
    { title: 'No Due Date', data: noDate },
    { title: 'Completed', data: completed },
  ].filter((s) => s.data.length > 0);
}

export default function TasksScreen() {
  const theme = useTheme();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('priority');

  const { data: tasks = [], isLoading, isError } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (statusFilter === null && t.status === 'DONE') return false;
        if (statusFilter !== null && t.status !== statusFilter) return false;
        if (priorityFilter && t.priority !== priorityFilter) return false;
        return true;
      }),
    [tasks, statusFilter, priorityFilter],
  );

  const sections = useMemo(
    () =>
      groupBy === 'priority'
        ? buildPrioritySections(filtered)
        : buildDueDateSections(filtered),
    [filtered, groupBy],
  );

  const handleAdd = useCallback(
    (title: string, priority: Priority, dueDate: string | null, goalId: string | null) => {
      createTask.mutate({ title, priority, dueDate, goalId });
    },
    [createTask.mutate],
  );

  const handleUpdate = useCallback(
    (id: string, payload: UpdateTaskPayload) => {
      updateTask.mutate({ id, payload });
    },
    [updateTask.mutate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTask.mutate(id);
    },
    [deleteTask.mutate],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Tasks</ThemedText>
          {tasks.length > 0 && (
            <Text style={[styles.count, { color: theme.textSecondary }]}>
              {filtered.length}
            </Text>
          )}
        </View>

        <FilterBar
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
        />

        <AddTask onAdd={handleAdd} />

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Could not load tasks.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {statusFilter || priorityFilter
                    ? 'No tasks match the current filters.'
                    : 'No tasks yet. Add one above.'}
                </Text>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {section.title.toUpperCase()}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <TaskItem task={item} onUpdate={handleUpdate} onDelete={handleDelete} />
            )}
            SectionSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
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
  sectionHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
