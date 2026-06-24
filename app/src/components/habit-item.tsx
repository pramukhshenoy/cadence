import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { Habit } from '@/types/habit';

interface HabitItemProps {
  habit: Habit;
  onToggle: (id: string, completedToday: boolean) => void;
}

export function HabitItem({ habit, onToggle }: HabitItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      style={[styles.row, { backgroundColor: theme.backgroundElement }]}
      onPress={() => onToggle(habit.id, habit.completedToday)}>
      <View
        style={[
          styles.circle,
          {
            borderColor: habit.completedToday ? '#22c55e' : theme.backgroundSelected,
            backgroundColor: habit.completedToday ? '#22c55e' : 'transparent',
          },
        ]}>
        {habit.completedToday && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            {
              color: habit.completedToday ? theme.textSecondary : theme.text,
              textDecorationLine: habit.completedToday ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}>
          {habit.name}
        </Text>
        {habit.streak > 0 && (
          <Text style={[styles.streak, { color: theme.textSecondary }]}>
            {habit.streak}{' '}
            {habit.frequency === 'DAILY'
              ? habit.streak === 1 ? 'day' : 'days'
              : habit.streak === 1 ? 'week' : 'weeks'}{' '}
            streak
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.two,
    marginBottom: 1,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  streak: {
    fontSize: 12,
    lineHeight: 16,
  },
});
