import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded/600SemiBold';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, type NativeStackNavigationOptions, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplash } from '@/components/animated-splash';
import { StoreProvider } from '@/data/store';
import { ThemeProvider, useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();
// The JS overlay starts on the same frame as the native splash, so swap without a fade.
SplashScreen.setOptions({ duration: 0, fade: false });

export const unstable_settings = { anchor: '(tabs)' };

const sheetOptions = (bg: string): NativeStackNavigationOptions => ({
  presentation: 'formSheet',
  sheetAllowedDetents: [0.75, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: bg },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [showSplash, setShowSplash] = useState(true);
  // Hide the native splash only once the animated overlay is on screen, so nothing flashes.
  const hideNativeSplash = useCallback(() => SplashScreen.hide(), []);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <StoreProvider>
          <AppStack />
        </StoreProvider>
      </ThemeProvider>
      {showSplash && <AnimatedSplash onReady={hideNativeSplash} onFinish={finishSplash} />}
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { scheme, colors } = useTheme();

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.indigo,
        background: colors.bg,
        card: colors.bg,
        text: colors.ink,
        border: colors.line,
        notification: colors.coral,
      },
    };
  }, [scheme, colors]);

  // Root view colour shows behind sheets and during transitions.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  const sheet = sheetOptions(colors.bg);

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plan/[id]" />
        <Stack.Screen name="propuestas" />
        <Stack.Screen name="nuevo-plan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="agendar/[id]" options={sheet} />
        <Stack.Screen name="enviar/[id]" options={sheet} />
        <Stack.Screen name="nuevo-deseo" options={sheet} />
        <Stack.Screen name="ajustes" options={sheet} />
      </Stack>
    </NavigationThemeProvider>
  );
}
