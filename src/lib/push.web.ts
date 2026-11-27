// Push notifications are native-only (Android/iOS). No-ops on web.
export async function unregisterPush(): Promise<void> {}

export function usePushNotifications(_signedIn: boolean) {}
