import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NEUTRAL } from '../../../constants/theme';

export default function SupervisorTabsLayout() {
  // Mirror the collector portal: tab bar lifts above gesture-nav / home
  // indicator via safe-area inset, every tab owns its own in-screen header.
  const insets = useSafeAreaInsets();
  const tabBarBaseHeight = 56;
  const tabBarBottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: NEUTRAL.ink,
        tabBarInactiveTintColor: NEUTRAL.inkSoft,
        tabBarStyle: {
          backgroundColor: NEUTRAL.surface,
          borderTopColor: NEUTRAL.borderSoft,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: tabBarBottomPadding,
          height: tabBarBaseHeight + tabBarBottomPadding,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.1,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="deposits"
        options={{
          title: 'Dépôts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: 'Retraits',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="collectors"
        options={{
          title: 'Collecteurs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Rapports',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
