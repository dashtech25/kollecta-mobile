import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NEUTRAL } from '../../../constants/theme';

export default function CollectorTabsLayout() {
  // Lift the tab bar above the system navigation bar on Android (gesture nav)
  // and the iOS home indicator. Hardcoded `paddingBottom` would let those
  // system controls draw over our tabs, so we compose the safe-area inset.
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
        // Default header style for not-yet-refonted screens (neutral, no red)
        headerStyle: {
          backgroundColor: NEUTRAL.surface,
          borderBottomWidth: 1,
          borderBottomColor: NEUTRAL.borderSoft,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: NEUTRAL.ink,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
          color: NEUTRAL.ink,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerShown: false, // dashboard has its own in-screen header
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          headerShown: false, // inner Stack manages headers
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="deposits"
        options={{
          title: 'Dépôts',
          headerShown: false, // inner Stack manages headers
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
        name="withdrawals"
        options={{
          title: 'Retraits',
          headerShown: false, // inner Stack manages headers
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
        name="profile"
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
