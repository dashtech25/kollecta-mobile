import { Stack } from 'expo-router';

export default function CollectorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}
