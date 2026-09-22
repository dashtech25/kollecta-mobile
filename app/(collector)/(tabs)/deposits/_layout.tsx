import { Stack } from 'expo-router';
import { NEUTRAL } from '../../../../constants/theme';

export default function DepositsStackLayout() {
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
    </Stack>
  );
}
