import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, CardShadow } from '@/constants/theme';
import type { Habit } from '@/types/habit';

interface HabitItemProps {
  habit: Habit;
  onToggle: (id: string, completedToday: boolean) => void;
}

export function HabitItem({ habit, onToggle }: HabitItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        CardShadow,
      ]}
      onPress={() => onToggle(habit.id, habit.completedToday)}>
      <View
        style={[
          styles.circle,
          {
            borderColor: habit.completedToday ? theme.accent : theme.border,
            backgroundColor: habit.completedToday ? theme.accent : 'transparent',
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
            🔥{' '}{habit.streak}{' '}
            {habit.frequency === 'DAILY'
              ? habit.streak === 1 ? 'day' : 'days'
              : habit.streak === 1 ? 'week' : 'weeks'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 6,
    gap: Spacing.two + 4,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    gap: 3,
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
