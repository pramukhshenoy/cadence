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
import type { Frequency } from '@/types/habit';

const FREQUENCIES: Frequency[] = ['DAILY', 'WEEKLY'];

const WEEK_DAYS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

interface AddHabitProps {
  onAdd: (name: string, frequency: Frequency, weeklyTargetDays?: number[]) => void;
}

export function AddHabit({ onAdd }: AddHabitProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('DAILY');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  const canSubmit = name.trim().length > 0 && (frequency === 'DAILY' || selectedDays.length > 0);

  function submit() {
    if (!canSubmit) return;
    onAdd(
      name.trim(),
      frequency,
      frequency === 'WEEKLY' ? selectedDays : undefined,
    );
    setName('');
    setFrequency('DAILY');
    setSelectedDays([]);
    inputRef.current?.focus();
  }

  function dismiss() {
    setName('');
    setFrequency('DAILY');
    setSelectedDays([]);
    setExpanded(false);
    Keyboard.dismiss();
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
          value={name}
          onChangeText={setName}
          onFocus={() => setExpanded(true)}
          placeholder="Add a habit..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="done"
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        {expanded && (
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={[
              styles.addBtn,
              { backgroundColor: theme.accent, opacity: canSubmit ? 1 : 0.35 },
            ]}>
            <Text style={[styles.addBtnLabel, { color: theme.accentForeground }]}>Add</Text>
          </Pressable>
        )}
      </View>
      {expanded && (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.freqRow}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  setFrequency(f);
                  if (f === 'DAILY') setSelectedDays([]);
                }}
                style={[
                  styles.chip,
                  { borderColor: theme.accent },
                  frequency === f && { backgroundColor: theme.accent },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: frequency === f ? theme.accentForeground : theme.accent },
                  ]}>
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={dismiss}>
            <Text style={[styles.cancelLabel, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      )}
      {expanded && frequency === 'WEEKLY' && (
        <View style={[styles.daysRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.daysLabel, { color: theme.textSecondary }]}>Target days</Text>
          <View style={styles.dayChips}>
            {WEEK_DAYS.map((day, idx) => {
              const active = selectedDays.includes(day.value);
              return (
                <Pressable
                  key={idx}
                  onPress={() => toggleDay(day.value)}
                  style={[
                    styles.dayChip,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.accent : 'transparent',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.dayChipLabel,
                      { color: active ? theme.accentForeground : theme.textSecondary },
                    ]}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
  plus: { fontSize: 22, lineHeight: 26, fontWeight: '400' },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },
  addBtn: {
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
    borderRadius: 8,
  },
  addBtnLabel: { fontSize: 13, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  freqRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  cancelLabel: { fontSize: 13, fontWeight: '500' },
  daysRow: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one + 2,
  },
  daysLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingTop: Spacing.two,
  },
  dayChips: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  dayChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
