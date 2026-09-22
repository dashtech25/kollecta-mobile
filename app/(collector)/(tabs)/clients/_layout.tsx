import { Stack } from 'expo-router';
import { NEUTRAL } from '../../../../constants/theme';

export default function ClientsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Each screen renders its own in-screen header
        contentStyle: { backgroundColor: NEUTRAL.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="edit/[id]" />
    </Stack>
  );
}
