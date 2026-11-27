import Storage, { SQLiteStorage } from 'expo-sqlite/kv-store';

/*
 * Persists the Supabase session on device, in its own SQLite file.
 *
 * Why not the default kv-store: expo-sqlite reuses one native connection per database name.
 * Supabase reads the session with the async API, whose first call opens the database inside
 * BEGIN … await … COMMIT. If the theme preference (sync API, same default database) is read
 * during that await, its own transaction fails and rolls back Supabase's, which then throws
 * "cannot commit - no transaction is active". A separate file means a separate connection.
 *
 * The default database is now only used through the sync API (src/theme/preference-storage.ts),
 * which can't interleave with anything.
 */
const store = new SQLiteStorage('planazo-auth');

/** Sessions saved before the move lived in the default database: move them over once. */
async function takeLegacy(key: string): Promise<string | null> {
  try {
    const legacy = Storage.getItemSync(key);
    if (legacy === null) return null;
    await store.setItem(key, legacy);
    Storage.removeItemSync(key);
    return legacy;
  } catch {
    return null;
  }
}

export const authStorage = {
  getItem: async (key: string) => (await store.getItem(key)) ?? takeLegacy(key),
  setItem: (key: string, value: string) => store.setItem(key, value),
  removeItem: async (key: string) => {
    await store.removeItem(key);
  },
};
