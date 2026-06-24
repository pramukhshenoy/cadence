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

interface AddHabitProps {
  onAdd: (name: string, frequency: Frequency) => void;
}

export function AddHabit({ onAdd }: AddHabitProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('DAILY');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, frequency);
    setName('');
    setFrequency('DAILY');
    inputRef.current?.focus();
  }

  function dismiss() {
    setName('');
    setFrequency('DAILY');
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
            disabled={!name.trim()}
            style={[
              styles.addBtn,
              { backgroundColor: theme.accent, opacity: name.trim() ? 1 : 0.35 },
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
                onPress={() => setFrequency(f)}
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
});
