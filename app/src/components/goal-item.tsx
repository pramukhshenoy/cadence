import React, { useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, CardShadow } from '@/constants/theme';
import type { Goal, GoalStatus, UpdateGoalPayload } from '@/types/goal';
import type { Priority } from '@/types/task';

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatTargetDate(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  if (days < 30) return `${days} days left`;
  const months = Math.round(days / 30);
  return `${months} month${months > 1 ? 's' : ''} left`;
}

interface GoalItemProps {
  goal: Goal;
  onUpdate: (id: string, payload: UpdateGoalPayload) => void;
  onDelete: (id: string) => void;
}

export const GoalItem = React.memo(function GoalItem({ goal, onUpdate, onDelete }: GoalItemProps) {
  const theme = useTheme();
  const router = useRouter();
  const swipeable = useRef<React.ElementRef<typeof ReanimatedSwipeable>>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editPriority, setEditPriority] = useState<Priority>(goal.priority);

  const isActive = goal.status === 'ACTIVE';
  const isDone = goal.status === 'COMPLETED';

  function openEdit() {
    setEditTitle(goal.title);
    setEditPriority(goal.priority);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    const trimmed = editTitle.trim();
    if (!trimmed) { cancelEdit(); return; }
    const updates: UpdateGoalPayload = {};
    if (trimmed !== goal.title) updates.title = trimmed;
    if (editPriority !== goal.priority) updates.priority = editPriority;
    if (Object.keys(updates).length > 0) onUpdate(goal.id, updates);
    setEditing(false);
  }

  function handlePress() {
    if (!editing) router.push(`/goals/${goal.id}` as never);
  }

  const renderLeftAction = () => (
    <View style={[styles.action, { backgroundColor: isActive ? '#22C55E' : '#6B7280' }]}>
      <Text style={styles.actionLabel}>{isActive ? 'Complete' : 'Reopen'}</Text>
    </View>
  );

  const renderRightAction = () => (
    <View style={[styles.action, { backgroundColor: '#EF4444' }]}>
      <Text style={styles.actionLabel}>Delete</Text>
    </View>
  );

  const nextStatus: GoalStatus = isActive ? 'COMPLETED' : 'ACTIVE';

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      enabled={!editing}
      renderLeftActions={renderLeftAction}
      renderRightActions={renderRightAction}
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
      onSwipeableOpen={(direction) => {
        swipeable.current?.close();
        if (direction === 'left') {
          onUpdate(goal.id, { status: nextStatus });
        } else {
          onDelete(goal.id);
        }
      }}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          CardShadow,
        ]}>
        {editing ? (
          <View style={styles.editForm}>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={[styles.editInput, { color: theme.text, borderBottomColor: theme.border }]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveEdit}
            />
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setEditPriority(p)}
                  style={[
                    styles.chip,
                    { borderColor: PRIORITY_COLOR[p] },
                    editPriority === p && { backgroundColor: PRIORITY_COLOR[p] },
                  ]}>
                  <Text style={[styles.chipLabel, { color: editPriority === p ? '#fff' : PRIORITY_COLOR[p] }]}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.editButtons}>
              <Pressable onPress={saveEdit} style={[styles.btn, { backgroundColor: theme.accent }]}>
                <Text style={[styles.btnLabel, { color: theme.accentForeground }]}>Save</Text>
              </Pressable>
              <Pressable onPress={cancelEdit} style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={[styles.btnLabel, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.viewContent} onLongPress={openEdit} onPress={handlePress}>
            <View style={styles.header}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[goal.priority] }]} />
              <Text
                style={[
                  styles.title,
                  { color: isDone ? theme.textSecondary : theme.text },
                  isDone && styles.strikethrough,
                ]}
                numberOfLines={2}>
                {goal.title}
              </Text>
              {goal.status !== 'ACTIVE' && (
                <View style={[styles.statusBadge, { backgroundColor: isDone ? '#22C55E22' : '#6B728022' }]}>
                  <Text style={[styles.statusBadgeLabel, { color: isDone ? '#22C55E' : '#6B7280' }]}>
                    {isDone ? 'Done' : 'Abandoned'}
                  </Text>
                </View>
              )}
            </View>
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
                {goal.doneTasks}/{goal.totalTasks} ({goal.progressPercent}%)
              </Text>
            </View>
            <View style={styles.meta}>
              {goal.targetDate != null && (
                <Text style={[styles.metaText, { color: daysUntil(goal.targetDate) < 0 ? '#EF4444' : theme.textSecondary }]}>
                  {formatTargetDate(goal.targetDate)}
                </Text>
              )}
              {goal.velocityCount > 0 && (
                <Text style={[styles.metaText, { color: '#22C55E' }]}>
                  +{goal.velocityCount} this week
                </Text>
              )}
            </View>
          </Pressable>
        )}
      </View>
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  viewContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 6,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    marginTop: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    flexShrink: 0,
  },
  statusBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 0,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  metaText: {
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
  editForm: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  editInput: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 8,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
