import { Stack } from 'expo-router';

import { brand } from '@/theme/tokens';

// Redirects into this group (signed out) land on the login screen.
export const unstable_settings = { initialRouteName: 'login' };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: brand.indigo } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="registro" />
      <Stack.Screen name="recuperar" />
    </Stack>
  );
}
