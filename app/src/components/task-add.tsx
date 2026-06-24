import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { Priority } from '@/types/task';

const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#6b7280',
};

interface AddTaskProps {
  onAdd: (title: string, priority: Priority) => void;
}

export function AddTask({ onAdd }: AddTaskProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, priority);
    setTitle('');
    setPriority('MEDIUM');
    // Stay expanded for quick multi-add; user can tap Cancel to close
    inputRef.current?.focus();
  }

  function dismiss() {
    setTitle('');
    setPriority('MEDIUM');
    setExpanded(false);
    Keyboard.dismiss();
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderBottomColor: theme.backgroundSelected },
      ]}>
      <View style={styles.inputRow}>
        <Text style={[styles.plus, { color: theme.textSecondary }]}>+</Text>
        <TextInput
          ref={inputRef}
          value={title}
          onChangeText={setTitle}
          onFocus={() => setExpanded(true)}
          placeholder="Add a task..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="done"
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        {expanded && (
          <Pressable onPress={submit} disabled={!title.trim()} style={[styles.addBtn, { opacity: title.trim() ? 1 : 0.35 }]}>
            <Text style={styles.addBtnLabel}>Add</Text>
          </Pressable>
        )}
      </View>
      {expanded && (
        <View style={styles.footer}>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.chip,
                  { borderColor: PRIORITY_COLOR[p] },
                  priority === p && { backgroundColor: PRIORITY_COLOR[p] },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: priority === p ? '#fff' : PRIORITY_COLOR[p] },
                  ]}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={dismiss}>
            <Text style={[styles.cancelLabel, { color: theme.textSecondary }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.two,
  },
  plus: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '400',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: '#3c87f7',
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
    borderRadius: 6,
  },
  addBtnLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two + 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
