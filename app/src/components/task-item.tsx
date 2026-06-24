import React, { useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { Task, Priority, UpdateTaskPayload } from '@/types/task';

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#6b7280',
};

const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, payload: UpdateTaskPayload) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const theme = useTheme();
  const swipeable = useRef<React.ElementRef<typeof ReanimatedSwipeable>>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);

  function openEdit() {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    const updates: UpdateTaskPayload = {};
    if (trimmed !== task.title) updates.title = trimmed;
    if (editPriority !== task.priority) updates.priority = editPriority;
    if (Object.keys(updates).length > 0) onUpdate(task.id, updates);
    setEditing(false);
  }

  const renderCompleteAction = () => (
    <View
      style={[
        styles.action,
        { backgroundColor: task.status === 'DONE' ? '#6b7280' : '#22c55e' },
      ]}>
      <Text style={styles.actionLabel}>
        {task.status === 'DONE' ? 'Undo' : 'Done'}
      </Text>
    </View>
  );

  const renderDeleteAction = () => (
    <View style={[styles.action, { backgroundColor: '#ef4444' }]}>
      <Text style={styles.actionLabel}>Delete</Text>
    </View>
  );

  const isDone = task.status === 'DONE';

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      enabled={!editing}
      renderLeftActions={renderCompleteAction}
      renderRightActions={renderDeleteAction}
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
      onSwipeableOpen={(direction) => {
        swipeable.current?.close();
        if (direction === 'left') {
          onUpdate(task.id, { status: isDone ? 'TODO' : 'DONE' });
        } else {
          onDelete(task.id);
        }
      }}>
      <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        {editing ? (
          <View style={[styles.editForm, { backgroundColor: theme.backgroundElement }]}>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={[
                styles.editInput,
                {
                  color: theme.text,
                  borderBottomColor: theme.backgroundSelected,
                },
              ]}
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
                    styles.priorityChip,
                    { borderColor: PRIORITY_COLOR[p] },
                    editPriority === p && {
                      backgroundColor: PRIORITY_COLOR[p],
                    },
                  ]}>
                  <Text
                    style={[
                      styles.priorityChipLabel,
                      {
                        color:
                          editPriority === p ? '#fff' : PRIORITY_COLOR[p],
                      },
                    ]}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.editButtons}>
              <Pressable
                onPress={saveEdit}
                style={[styles.btn, { backgroundColor: '#3c87f7' }]}>
                <Text style={[styles.btnLabel, { color: '#fff' }]}>Save</Text>
              </Pressable>
              <Pressable
                onPress={cancelEdit}
                style={[
                  styles.btn,
                  { backgroundColor: theme.backgroundSelected },
                ]}>
                <Text
                  style={[styles.btnLabel, { color: theme.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.viewContent} onPress={openEdit}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: PRIORITY_COLOR[task.priority] },
              ]}
            />
            <View style={styles.info}>
              <Text
                style={[
                  styles.taskTitle,
                  { color: isDone ? theme.textSecondary : theme.text },
                  isDone && styles.strikethrough,
                ]}
                numberOfLines={2}>
                {task.title}
              </Text>
              {task.dueDate != null && (
                <Text style={[styles.due, { color: isOverdue(task.dueDate) && !isDone ? '#ef4444' : theme.textSecondary }]}>
                  {formatDue(task.dueDate)}
                </Text>
              )}
            </View>
            {task.status === 'IN_PROGRESS' && (
              <Text style={styles.inProgressBadge}>In Progress</Text>
            )}
          </Pressable>
        )}
      </View>
    </ReanimatedSwipeable>
  );
}

function toLocalMidnight(iso: string): Date {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isOverdue(iso: string): boolean {
  const d = toLocalMidnight(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function formatDue(iso: string): string {
  const d = toLocalMidnight(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(d, today)) return 'Due today';
  if (isSameDay(d, tomorrow)) return 'Due tomorrow';
  if (d < today)
    return `Overdue · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 1,
  },
  viewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.two,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  due: {
    fontSize: 12,
    lineHeight: 16,
  },
  inProgressBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
    flexShrink: 0,
  },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 1,
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
  priorityChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  priorityChipLabel: {
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
    borderRadius: 6,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
