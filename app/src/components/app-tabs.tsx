import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, ColorValue } from 'react-native';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

type TabName = 'home' | 'tasks' | 'habits' | 'chat' | 'settings';

function TabIcon({ name, color, size }: { name: TabName; color: ColorValue; size: number }) {
  const s = Math.round(size * 0.9);
  return (
    <View style={[iconStyles.wrapper, { width: s, height: s }]}>
      {name === 'home' && <HomeIcon color={color} size={s} />}
      {name === 'tasks' && <TasksIcon color={color} size={s} />}
      {name === 'habits' && <HabitsIcon color={color} size={s} />}
      {name === 'chat' && <ChatIcon color={color} size={s} />}
      {name === 'settings' && <SettingsIcon color={color} size={s} />}
    </View>
  );
}

function HomeIcon({ color, size }: { color: ColorValue; size: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Text style={{ fontSize: size * 0.9, color, lineHeight: size, includeFontPadding: false }}>⌂</Text>
    </View>
  );
}

function TasksIcon({ color, size }: { color: ColorValue; size: number }) {
  const box = size * 0.72;
  const tick = size * 0.4;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: box, height: box, borderWidth: 2, borderColor: color, borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: tick, color, lineHeight: tick + 2, includeFontPadding: false, fontWeight: '700' }}>✓</Text>
      </View>
    </View>
  );
}

function HabitsIcon({ color, size }: { color: ColorValue; size: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Text style={{ fontSize: size * 0.85, color, lineHeight: size, includeFontPadding: false }}>◉</Text>
    </View>
  );
}

function ChatIcon({ color, size }: { color: ColorValue; size: number }) {
  const w = size * 0.9;
  const h = size * 0.72;
  const tail = size * 0.18;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: w, height: h, borderWidth: 2, borderColor: color, borderRadius: size * 0.3, marginBottom: tail * 0.5 }} />
      <View style={{
        position: 'absolute', bottom: size * 0.05, left: size * 0.18,
        borderLeftWidth: tail, borderRightWidth: 0, borderTopWidth: tail,
        borderLeftColor: 'transparent', borderTopColor: color,
      }} />
    </View>
  );
}

function SettingsIcon({ color, size }: { color: ColorValue; size: number }) {
  const r = size * 0.36;
  const inner = size * 0.18;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: r * 2, height: r * 2, borderRadius: r, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: inner * 2, height: inner * 2, borderRadius: inner, backgroundColor: color }} />
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const TABS: Array<{ name: string; title: string; icon: TabName }> = [
  { name: 'index', title: 'Dashboard', icon: 'home' },
  { name: 'tasks', title: 'Tasks', icon: 'tasks' },
  { name: 'habits', title: 'Habits', icon: 'habits' },
  { name: 'chat', title: 'Chat', icon: 'chat' },
  { name: 'settings', title: 'Settings', icon: 'settings' },
];

export default function AppTabs() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 2,
        },
      }}>
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <TabIcon name={icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
