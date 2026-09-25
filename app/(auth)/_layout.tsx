import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="select-organization" />
      <Stack.Screen name="login" />
      <Stack.Screen name="login-otp" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="otp-verify" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen
        name="privacy-policy"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="terms"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
