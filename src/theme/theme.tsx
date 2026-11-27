import { createContext, type ReactNode, use, useMemo, useState } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';

import { preferenceStorage } from './preference-storage';
import { type Palette, palettes, type Scheme } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'planazo.theme';

type ThemeContextValue = {
  /** What the user picked in Ajustes. */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** The scheme actually in use. */
  scheme: Scheme;
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  const saved = preferenceStorage.get(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** Tells native UI (sheets, alerts, keyboard, switches) which scheme to draw. */
function applyNative(p: ThemePreference) {
  Appearance.setColorScheme(p === 'system' ? 'auto' : p);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const p = readPreference();
    applyNative(p);
    return p;
  });
  const system = useColorScheme();
  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreference: (p) => {
        applyNative(p);
        preferenceStorage.set(STORAGE_KEY, p);
        setPreferenceState(p);
      },
      scheme,
      colors: palettes[scheme],
    }),
    [preference, scheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export const useColors = () => useTheme().colors;

/** Like StyleSheet.create, but the styles depend on the active palette. Each scheme is built once. */
type Styles = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<T extends Styles>(factory: (colors: Palette) => T & Styles) {
  const cache: Partial<Record<Scheme, Readonly<T>>> = {};
  return function useStyles(): Readonly<T> {
    const { scheme, colors } = useTheme();
    return (cache[scheme] ??= StyleSheet.create(factory(colors)));
  };
}
