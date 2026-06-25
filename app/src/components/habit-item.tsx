import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, CardShadow } from '@/constants/theme';
import type { Habit } from '@/types/habit';

interface HabitItemProps {
  habit: Habit;
  onToggle: (id: string, completedToday: boolean) => void;
  onDelete: (id: string) => void;
}

export function HabitItem({ habit, onToggle, onDelete }: HabitItemProps) {
  const theme = useTheme();
  const swipeable = useRef<React.ElementRef<typeof ReanimatedSwipeable>>(null);

  const renderDeleteAction = () => (
    <View style={[styles.action, { backgroundColor: '#EF4444' }]}>
      <Text style={styles.actionLabel}>Delete</Text>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      renderRightActions={renderDeleteAction}
      friction={2}
      rightThreshold={60}
      onSwipeableOpen={(direction) => {
        swipeable.current?.close();
        if (direction === 'right') {
          onDelete(habit.id);
        }
      }}>
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
    </ReanimatedSwipeable>
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
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: 12,
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
