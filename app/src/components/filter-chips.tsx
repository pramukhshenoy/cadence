import React from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { Priority, TaskStatus } from '@/types/task';

interface ChipOption<T> {
  label: string;
  value: T | null;
}

interface ChipRowProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChipRowProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.rowWrapper}>
      <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => onChange(active ? null : opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.accent : theme.backgroundElement,
                  borderColor: active ? theme.accent : theme.border,
                },
              ]}>
              <Text
                style={[
                  styles.chipLabel,
                  { color: active ? theme.accentForeground : theme.textSecondary },
                ]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const STATUS_OPTIONS: ChipOption<TaskStatus>[] = [
  { label: 'All', value: null },
  { label: 'Todo', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Done', value: 'DONE' },
];

const PRIORITY_OPTIONS: ChipOption<Priority>[] = [
  { label: 'All', value: null },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

interface FilterBarProps {
  statusFilter: TaskStatus | null;
  priorityFilter: Priority | null;
  onStatusChange: (value: TaskStatus | null) => void;
  onPriorityChange: (value: Priority | null) => void;
  groupBy: 'priority' | 'due-date';
  onGroupByChange: (value: 'priority' | 'due-date') => void;
}

export function FilterBar({
  statusFilter,
  priorityFilter,
  onStatusChange,
  onPriorityChange,
  groupBy,
  onGroupByChange,
}: FilterBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <ChipRow
        label="Status"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={onStatusChange}
      />
      <ChipRow
        label="Priority"
        options={PRIORITY_OPTIONS}
        value={priorityFilter}
        onChange={onPriorityChange}
      />
      <View style={styles.groupRow}>
        <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
          Group
        </Text>
        <View style={[styles.groupToggle, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
          {(['priority', 'due-date'] as const).map((g) => {
            const active = groupBy === g;
            return (
              <Pressable
                key={g}
                onPress={() => onGroupByChange(g)}
                style={[
                  styles.groupBtn,
                  active && { backgroundColor: theme.backgroundElement },
                ]}>
                <Text
                  style={[
                    styles.groupBtnLabel,
                    { color: active ? theme.text : theme.textSecondary },
                  ]}>
                  {g === 'priority' ? 'Priority' : 'Due Date'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.two,
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 52,
    flexShrink: 0,
  },
  scrollContent: {
    gap: Spacing.one,
    flexDirection: 'row',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  groupToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  groupBtn: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  groupBtnLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
