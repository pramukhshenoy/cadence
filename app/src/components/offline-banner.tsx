import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner({ visible }: { visible: boolean }) {
  const { top } = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={[styles.banner, { paddingTop: top + 6 }]}>
      <Text style={styles.text}>Backend unreachable — check server connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    paddingBottom: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
