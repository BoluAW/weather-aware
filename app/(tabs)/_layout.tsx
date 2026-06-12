import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#0f172a' },
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
          tabBarIcon: ({ color }) => (
            <TabIcon icon="➕" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="⚙️" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon }: { icon: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
