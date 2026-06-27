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
import { Spacing, CardShadow } from '@/constants/theme';
import type { Priority } from '@/types/task';

const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

function offsetMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const DATE_PRESETS = [
  { label: '1 month', iso: () => offsetMonths(1) },
  { label: '3 months', iso: () => offsetMonths(3) },
  { label: '6 months', iso: () => offsetMonths(6) },
  { label: '1 year', iso: () => offsetMonths(12) },
];

interface AddGoalProps {
  onAdd: (title: string, priority: Priority, targetDate: string | null) => void;
}

export function AddGoal({ onAdd }: AddGoalProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [targetDate, setTargetDate] = useState<string | null>(null);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, priority, targetDate);
    setTitle('');
    setPriority('MEDIUM');
    setTargetDate(null);
    inputRef.current?.focus();
  }

  function dismiss() {
    setTitle('');
    setPriority('MEDIUM');
    setTargetDate(null);
    setExpanded(false);
    Keyboard.dismiss();
  }

  function togglePreset(iso: string) {
    setTargetDate((prev) => (prev === iso ? null : iso));
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        CardShadow,
      ]}>
      <View style={styles.inputRow}>
        <Text style={[styles.plus, { color: theme.accent }]}>+</Text>
        <TextInput
          ref={inputRef}
          value={title}
          onChangeText={setTitle}
          onFocus={() => setExpanded(true)}
          placeholder="Add a goal..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="done"
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        {expanded && (
          <Pressable
            onPress={submit}
            disabled={!title.trim()}
            style={[styles.addBtn, { backgroundColor: theme.accent, opacity: title.trim() ? 1 : 0.35 }]}>
            <Text style={[styles.addBtnLabel, { color: theme.accentForeground }]}>Add</Text>
          </Pressable>
        )}
      </View>
      {expanded && (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
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
                <Text style={[styles.chipLabel, { color: priority === p ? '#fff' : PRIORITY_COLOR[p] }]}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={dismiss}>
            <Text style={[styles.cancelLabel, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      )}
      {expanded && (
        <View style={[styles.dateRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Target</Text>
          {DATE_PRESETS.map((preset) => {
            const iso = preset.iso();
            const active = targetDate === iso;
            return (
              <Pressable
                key={preset.label}
                onPress={() => togglePreset(iso)}
                style={[
                  styles.chip,
                  { borderColor: theme.border },
                  active && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}>
                <Text style={[styles.chipLabel, { color: active ? theme.accentForeground : theme.textSecondary }]}>
                  {active ? formatDateShort(iso) : preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.two,
  },
  plus: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  addBtn: {
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
    borderRadius: 8,
  },
  addBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two + 4,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
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
  cancelLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
