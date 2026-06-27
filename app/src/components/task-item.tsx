import React, { useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, CardShadow } from '@/constants/theme';
import type { Task, Priority, UpdateTaskPayload } from '@/types/task';

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const DATE_PRESETS = [
  { label: 'Today', iso: () => offsetDate(0) },
  { label: 'Tomorrow', iso: () => offsetDate(1) },
  { label: 'Next week', iso: () => offsetDate(7) },
];

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, payload: UpdateTaskPayload) => void;
  onDelete: (id: string) => void;
}

export const TaskItem = React.memo(function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const theme = useTheme();
  const swipeable = useRef<React.ElementRef<typeof ReanimatedSwipeable>>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editDueDate, setEditDueDate] = useState<string | null>(task.dueDate ?? null);

  function openEdit() {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ?? null);
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
    if (editDueDate !== (task.dueDate ?? null)) updates.dueDate = editDueDate;
    if (Object.keys(updates).length > 0) onUpdate(task.id, updates);
    setEditing(false);
  }

  function togglePreset(iso: string) {
    setEditDueDate((prev) => (prev === iso ? null : iso));
  }

  const renderCompleteAction = () => (
    <View
      style={[
        styles.action,
        { backgroundColor: task.status === 'DONE' ? '#6B7280' : '#22C55E' },
      ]}>
      <Text style={styles.actionLabel}>
        {task.status === 'DONE' ? 'Undo' : 'Done'}
      </Text>
    </View>
  );

  const renderDeleteAction = () => (
    <View style={[styles.action, { backgroundColor: '#EF4444' }]}>
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
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
          CardShadow,
        ]}>
        {editing ? (
          <View style={styles.editForm}>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={[
                styles.editInput,
                {
                  color: theme.text,
                  borderBottomColor: theme.border,
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollRow} contentContainerStyle={styles.dateScrollContent}>
              <Text style={[styles.dateEditLabel, { color: theme.textSecondary }]}>Due</Text>
              {editDueDate !== null && (
                <Pressable
                  onPress={() => setEditDueDate(null)}
                  style={[styles.priorityChip, { borderColor: theme.border }]}>
                  <Text style={[styles.priorityChipLabel, { color: theme.textSecondary }]}>✕ Clear</Text>
                </Pressable>
              )}
              {DATE_PRESETS.map((preset) => {
                const iso = preset.iso();
                const active = editDueDate === iso;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => togglePreset(iso)}
                    style={[
                      styles.priorityChip,
                      { borderColor: theme.border },
                      active && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}>
                    <Text style={[styles.priorityChipLabel, { color: active ? theme.accentForeground : theme.textSecondary }]}>
                      {active ? formatDateShort(iso) : preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.editButtons}>
              <Pressable
                onPress={saveEdit}
                style={[styles.btn, { backgroundColor: theme.accent }]}>
                <Text style={[styles.btnLabel, { color: theme.accentForeground }]}>Save</Text>
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
                <Text style={[styles.due, { color: isOverdue(task.dueDate) && !isDone ? '#EF4444' : theme.textSecondary }]}>
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
});

function toLocalMidnight(iso: string): Date {
  // Parse date portion as local midnight to avoid UTC↔local shift
  const [year, month, day] = iso.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  viewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 6,
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
    gap: 3,
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
    color: '#F59E0B',
    flexShrink: 0,
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
  dateScrollRow: {
    marginTop: 2,
  },
  dateScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dateEditLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  priorityChip: {
    borderWidth: 1,
    borderRadius: 6,
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
    borderRadius: 8,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
