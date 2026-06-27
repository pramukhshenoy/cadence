import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { subscribeToToasts, type Toast } from '@/lib/toast';

const TOAST_DURATION_MS = 3500;
// Height of the Android tab bar defined in constants/theme.ts (BottomTabInset = 80)
const TAB_BAR_HEIGHT = 80;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor = toast.type === 'error' ? '#EF4444' : '#6366F1';

  return (
    <View
      style={[
        styles.toast,
        { backgroundColor: bgColor, bottom: bottom + TAB_BAR_HEIGHT + 8 },
      ]}>
      <Text style={styles.text}>{toast.message}</Text>
    </View>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
    });
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  // Render only the latest toast to avoid stacking
  const latest = toasts[toasts.length - 1];
  return <ToastItem key={latest.id} toast={latest} onDismiss={() => dismiss(latest.id)} />;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 14,
    zIndex: 2000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
