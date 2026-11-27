import { Stack } from 'expo-router';

import { brand } from '@/theme/tokens';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: brand.indigo } }} />;
}
