import { Stack } from 'expo-router';
import { NEUTRAL } from '../../../../constants/theme';

export default function WithdrawalsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: NEUTRAL.surface },
        headerTintColor: NEUTRAL.ink,
        headerTitleStyle: { fontWeight: '700', fontSize: 16, color: NEUTRAL.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: NEUTRAL.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="initiate" options={{ headerShown: false }} />
      <Stack.Screen
        name="verify/[id]"
        options={{
          title: 'Vérification',
          // Without this, expo-router falls back to the previous route name
          // ("index") for the iOS back-chevron label.
          headerBackTitle: 'Retraits',
        }}
      />
    </Stack>
  );
}
