import Storage from 'expo-sqlite/kv-store';

/** Persists the Supabase session on device (expo-sqlite key-value store, already used for preferences). */
export const authStorage = {
  getItem: (key: string) => Storage.getItem(key),
  setItem: (key: string, value: string) => Storage.setItem(key, value),
  removeItem: (key: string) => Storage.removeItem(key).then(() => undefined),
};
