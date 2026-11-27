// Push notifications are native-only (Android/iOS). No-ops on web.
export type PushPermission = 'granted' | 'undetermined' | 'blocked' | 'unavailable';

export async function unregisterPush(): Promise<void> {}

export function usePushNotifications(_signedIn: boolean) {}

export function usePushPermission() {
  return {
    permission: 'unavailable' as PushPermission | null,
    enable: async () => {},
    openSettings: async () => {},
  };
}
