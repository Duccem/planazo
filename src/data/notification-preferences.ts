import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';

/*
 * Which pushes the signed-in user wants (table `notification_preferences`).
 * No row means everything on; the first change creates it. The server checks these
 * before sending, so they apply to every device of the user.
 */

export type NotificationKind = 'invitations' | 'invitation_responses' | 'connections';
export type NotificationPreferences = Pick<Tables<'notification_preferences'>, NotificationKind>;

const DEFAULTS: NotificationPreferences = { invitations: true, invitation_responses: true, connections: true };

export function useNotificationPreferences() {
  const userId = useAuth().session?.user.id;
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from('notification_preferences')
      .select('invitations, invitation_responses, connections')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.warn('[notification_preferences] load', error.message);
        if (data) setPrefs(data);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const setPreference = useCallback(
    async (kind: NotificationKind, value: boolean) => {
      if (!userId) return;
      const previous = prefsRef.current;
      const next = { ...previous, [kind]: value };
      prefsRef.current = next;
      setPrefs(next);
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: userId, ...next }, { onConflict: 'user_id' });
      if (error) {
        console.warn('[notification_preferences] save', error.message);
        // Roll back only this switch, in case another one changed meanwhile.
        setPrefs((current) => ({ ...current, [kind]: previous[kind] }));
        Alert.alert('No se pudo guardar', 'Comprueba tu conexión e inténtalo de nuevo.');
      }
    },
    [userId],
  );

  return { prefs, loading, setPreference };
}
