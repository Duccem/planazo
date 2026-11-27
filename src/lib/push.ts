import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Push notifications (Expo Push Service). The server side lives in Supabase:
 * `push_tokens` + triggers on invitations/connections → Edge Function `send-push`.
 */

// Show notifications as banners also while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Token registered for the signed-in user on this device, so sign-out can remove it. */
let registeredToken: string | null = null;

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Asks for permission (once), gets the Expo push token and stores it for the current user. */
async function register(): Promise<void> {
  // Remote push isn't available in Expo Go on Android; it needs a development build.
  if (Platform.OS === 'android' && isRunningInExpoGo()) return;

  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Planazo',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3F2FD6',
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return;

  const id = projectId();
  if (!id) {
    console.warn('[push] Falta extra.eas.projectId en app.json');
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const { error } = await supabase.rpc('register_push_token', { token, platform: Platform.OS });
  if (error) {
    console.warn('[push] register_push_token', error.message);
    return;
  }
  registeredToken = token;
}

/** Removes this device's token. Call before signing out, while the session is still valid. */
export async function unregisterPush(): Promise<void> {
  const token = registeredToken;
  if (!token) return;
  registeredToken = null;
  const { error } = await supabase.rpc('unregister_push_token', { token });
  if (error) console.warn('[push] unregister_push_token', error.message);
}

/**
 * What the OS lets Planazo do on this device.
 * `blocked` = denied and the system won't show the prompt again (only Settings can fix it).
 * `unavailable` = no remote push here (web, Expo Go on Android).
 */
export type PushPermission = 'granted' | 'undetermined' | 'blocked' | 'unavailable';

async function readPermission(): Promise<PushPermission> {
  if (Platform.OS === 'android' && isRunningInExpoGo()) return 'unavailable';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  return canAskAgain ? 'undetermined' : 'blocked';
}

/**
 * Permission state for this device, refreshed when the app comes back to the foreground
 * (e.g. after the user toggles it in the system settings). `enable` asks for it, or opens
 * the system settings when the prompt can no longer be shown.
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const last = useRef<PushPermission | null>(null);

  const refresh = useCallback(async () => {
    const next = await readPermission().catch((): PushPermission => 'unavailable');
    // Turned on from the system settings while away: store this device's token now.
    if (next === 'granted' && last.current !== null && last.current !== 'granted' && !registeredToken) {
      register().catch((e) => console.warn('[push] register', e));
    }
    last.current = next;
    setPermission(next);
    return next;
  }, []);

  useEffect(() => {
    readPermission()
      .catch((): PushPermission => 'unavailable')
      .then((initial) => {
        last.current = initial;
        setPermission(initial);
      });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    const current = await refresh();
    if (current === 'blocked') {
      await Linking.openSettings();
      return;
    }
    if (current !== 'undetermined') return;
    await register().catch((e) => console.warn('[push] register', e));
    await refresh();
  }, [refresh]);

  return { permission, enable, openSettings: () => Linking.openSettings() };
}

function open(response: Notifications.NotificationResponse | null) {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const url = response.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
  void Notifications.clearLastNotificationResponseAsync();
}

/**
 * Registers the device while signed in and opens the screen a tapped notification points to
 * (also when the tap launched the app). Mount it inside the signed-in navigator.
 */
export function usePushNotifications(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;

    // Expo Go on Android has no remote push: the token APIs throw there, so skip them.
    const remotePush = !(Platform.OS === 'android' && isRunningInExpoGo());

    if (remotePush) register().catch((e) => console.warn('[push] register', e));
    // The native token can rotate while the app runs; store the new Expo token.
    const tokenSub = remotePush
      ? Notifications.addPushTokenListener(() => {
          register().catch((e) => console.warn('[push] re-register', e));
        })
      : null;

    let active = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active) open(response);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener(open);

    return () => {
      active = false;
      tokenSub?.remove();
      responseSub.remove();
    };
  }, [signedIn]);
}
