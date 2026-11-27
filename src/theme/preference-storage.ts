import Storage from 'expo-sqlite/kv-store';

/** Synchronous key-value storage so the saved theme is known before the first frame. */
export const preferenceStorage = {
  get: (key: string): string | null => {
    try {
      return Storage.getItemSync(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      Storage.setItemSync(key, value);
    } catch {
      // Not persisting a preference is not worth crashing over.
    }
  },
};
