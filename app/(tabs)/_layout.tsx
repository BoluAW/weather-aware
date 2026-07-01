import { Tabs } from 'expo-router';
import { usePalette } from '../../contexts/ThemeContext';
import { ColorValue } from 'react-native';

export default function TabsLayout() {
  const pal = usePalette();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: pal.primary,
        tabBarInactiveTintColor: pal.textMuted,
        tabBarStyle: {
          backgroundColor: pal.surface,
          borderTopColor: pal.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: pal.surface },
        headerTitleStyle: { fontWeight: '700', color: pal.text },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarLabel: 'Plans',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="📋" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="current-weather"
        options={{
          headerShown: false,
          tabBarLabel: 'Now',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="⛅" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-plan"
        options={{
          title: 'Add Plan',
          tabBarLabel: 'Add',
          headerStyle: { backgroundColor: pal.background },
          headerTitleStyle: { fontWeight: '700', color: pal.text },
          tabBarIcon: ({ color }) => (
            <TabIcon icon="➕" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: false,
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="⚙️" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: ColorValue }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}
