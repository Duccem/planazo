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
import { AuthProvider, useAuth } from '@/data/auth';
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

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <StoreProvider>
            <AppStack />
          </StoreProvider>
        </ThemeProvider>
        <Splash />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

/** Keeps the native splash up until the stored session is known, then plays the animated one. */
function Splash() {
  const { loading } = useAuth();
  const [done, setDone] = useState(false);
  // Hide the native splash only once the animated overlay is on screen, so nothing flashes.
  const hideNativeSplash = useCallback(() => SplashScreen.hide(), []);
  const finish = useCallback(() => setDone(true), []);

  if (loading || done) return null;
  return <AnimatedSplash onReady={hideNativeSplash} onFinish={finish} />;
}

function AppStack() {
  const { scheme, colors } = useTheme();
  const { session, loading } = useAuth();
  const signedIn = !!session;

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

  // Until the stored session is read, rendering the guards would bounce through the login screen.
  if (loading) return null;

  return (
    <NavigationThemeProvider value={navTheme}>
      {/* Auth screens sit on the indigo hero, so they always use light status bar content. */}
      <StatusBar style={!signedIn || scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="plan/[id]" />
          <Stack.Screen name="propuestas" />
          <Stack.Screen name="nuevo-plan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="agendar/[id]" options={sheet} />
          <Stack.Screen name="enviar/[id]" options={sheet} />
          <Stack.Screen name="nuevo-deseo" options={sheet} />
          <Stack.Screen name="ajustes" />
        </Stack.Protected>
        {/* Without a session every route above redirects here. */}
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}
