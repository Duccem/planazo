/** Web uses localStorage: expo-sqlite on web needs WASM and cross-origin isolation headers. */
export const preferenceStorage = {
  get: (key: string): string | null => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode or blocked storage: keep the in-memory value only.
    }
  },
};
