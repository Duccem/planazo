import type { PostgrestError } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';
import type { Me, Person, Relation, Wish, WishOwner } from './types';

/*
 * Profile, connections (partner + friends) and the shared wish list, backed by Supabase.
 * Changes are applied optimistically and rolled back if the server refuses them.
 * Realtime keeps the couple's list and new connections in sync across devices.
 */

type WishRow = Tables<'wishes'>;
type ProfileRow = Tables<'profiles'>;

type SocialState = {
  profile: ProfileRow | null;
  people: Person[];
  wishRows: WishRow[];
  loading: boolean;
};

type Result = { error: string | null };

type SocialActions = {
  addWish: (input: Pick<Wish, 'kind' | 'title' | 'note' | 'owner'>) => void;
  updateWish: (id: string, patch: Partial<Pick<Wish, 'title' | 'note' | 'done' | 'progress' | 'owner'>>) => void;
  removeWish: (id: string) => void;
  redeemCode: (code: string, relation: Relation) => Promise<Result & { name?: string }>;
  removeConnection: (personId: string) => Promise<Result>;
  refresh: () => Promise<void>;
};

type SocialContextValue = SocialState & { actions: SocialActions };

const SocialContext = createContext<SocialContextValue | null>(null);

const initial = (name: string) => name.trim()[0]?.toUpperCase() ?? '?';

/** Server error text → copy for the user. */
function describe(error: PostgrestError | null): string | null {
  if (!error) return null;
  const msg = error.message ?? '';
  if (msg.includes('invite_code_not_found')) return 'No hay nadie con ese código. Revisa que esté bien escrito.';
  if (msg.includes('invite_code_is_yours')) return 'Ese es tu propio código.';
  if (msg.includes('already_has_partner')) return 'Tú o esa persona ya tenéis pareja en Planazo.';
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return 'No hay conexión. Comprueba tu internet e inténtalo de nuevo.';
  }
  return 'Algo ha fallado. Inténtalo de nuevo.';
}

const reportFailure = (error: PostgrestError) => {
  Alert.alert('No se pudo guardar', describe(error) ?? undefined);
};

export function SocialProvider({ children }: { children: ReactNode }) {
  const userId = useAuth().session?.user.id;
  // Remounting per user starts from a clean state on sign-out or account switch.
  return (
    <UserSocialProvider key={userId ?? 'signed-out'} userId={userId}>
      {children}
    </UserSocialProvider>
  );
}

function UserSocialProvider({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  const [state, setState] = useState<SocialState>({ profile: null, people: [], wishRows: [], loading: true });
  // Actions read the latest state at call time (for rollbacks) without being recreated on every change.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [profile, connections, wishes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('connections')
        .select('relation, other:profiles!connections_other_id_fkey(id, name, color)')
        .eq('user_id', userId)
        .order('created_at'),
      supabase.from('wishes').select('*').order('created_at', { ascending: false }),
    ]);

    setState((prev) => ({
      profile: profile.data ?? prev.profile,
      people: connections.data
        ? connections.data
            .filter((c) => c.other)
            .map((c) => ({
              id: c.other.id,
              name: c.other.name,
              initial: initial(c.other.name),
              color: c.other.color,
              relation: c.relation,
            }))
        : prev.people,
      wishRows: wishes.data ?? prev.wishRows,
      loading: false,
    }));
  }, [userId]);

  // Realtime: any change to my connections or visible wishes triggers a refetch (RLS filters events).
  // The first load also happens here: once subscribed (so nothing slips in between load and
  // subscribe), on every reconnect, and if realtime is unavailable.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`social:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes' }, () => void refresh())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections', filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') void refresh();
      });
    // Catch up on anything missed while in the background.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const actions = useMemo<SocialActions>(() => {
    const partnerId = () => stateRef.current.people.find((p) => p.relation === 'pareja')?.id ?? null;
    const forId = (owner: WishOwner) => (owner === 'yo' ? userId! : owner === 'pareja' ? partnerId() : null);
    const setWishes = (fn: (rows: WishRow[]) => WishRow[]) => setState((s) => ({ ...s, wishRows: fn(s.wishRows) }));

    return {
      refresh,

      addWish(input) {
        if (!userId) return;
        const insert = {
          id: randomUUID(),
          added_by: userId,
          for_id: forId(input.owner),
          kind: input.kind,
          title: input.title,
          note: input.note ?? null,
          progress: input.kind === 'meta' ? 0 : null,
        };
        // Shown right away; the id is generated here so later edits target the same row.
        const tempId = insert.id;
        const now = new Date().toISOString();
        setWishes((rows) => [{ ...insert, done: false, created_at: now, updated_at: now }, ...rows]);
        void supabase
          .from('wishes')
          .insert(insert)
          .select()
          .single()
          .then(({ data, error }) => {
            if (error) {
              setWishes((rows) => rows.filter((r) => r.id !== tempId));
              reportFailure(error);
            } else if (data) {
              setWishes((rows) => rows.map((r) => (r.id === tempId ? data : r)));
            }
          });
      },

      updateWish(id, patch) {
        const before = stateRef.current.wishRows.find((r) => r.id === id);
        if (!before) return;
        const update: Partial<WishRow> = {};
        if (patch.title !== undefined) update.title = patch.title;
        if (patch.note !== undefined) update.note = patch.note ?? null;
        if (patch.done !== undefined) update.done = patch.done;
        if (patch.progress !== undefined) update.progress = before.kind === 'meta' ? (patch.progress ?? null) : null;
        if (patch.owner !== undefined) update.for_id = forId(patch.owner);
        setWishes((rows) => rows.map((r) => (r.id === id ? { ...r, ...update } : r)));
        void supabase
          .from('wishes')
          .update(update)
          .eq('id', id)
          .then(({ error }) => {
            if (error) {
              setWishes((rows) => rows.map((r) => (r.id === id ? before : r)));
              reportFailure(error);
            }
          });
      },

      removeWish(id) {
        const before = stateRef.current.wishRows;
        setWishes((rows) => rows.filter((r) => r.id !== id));
        void supabase
          .from('wishes')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) {
              setWishes(() => before);
              reportFailure(error);
            }
          });
      },

      async redeemCode(code, relation) {
        const { data, error } = await supabase.rpc('redeem_invite_code', {
          code: code.trim().toUpperCase(),
          as_relation: relation,
        });
        if (error) return { error: describe(error) };
        await refresh();
        return { error: null, name: data?.name };
      },

      async removeConnection(personId) {
        const { error } = await supabase.rpc('remove_connection', { other: personId });
        if (error) return { error: describe(error) };
        await refresh();
        return { error: null };
      },
    };
  }, [userId, refresh]);

  const value = useMemo(() => ({ ...state, actions }), [state, actions]);
  return <SocialContext value={value}>{children}</SocialContext>;
}

function useSocial() {
  const ctx = use(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside <SocialProvider>');
  return ctx;
}

export const useSocialActions = () => useSocial().actions;
export const useSocialLoading = () => useSocial().loading;
export const usePeopleFromServer = () => useSocial().people;

/** The signed-in user: profile row when loaded, session data until then. */
export function useMeFromServer(): Me {
  const user = useAuth().session?.user;
  const { profile } = useSocial();
  return useMemo(() => {
    const email = user?.email ?? '';
    const metaName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '';
    const emailName = email.split('@')[0] ?? '';
    const name =
      profile?.name ?? (metaName || (emailName ? emailName[0].toUpperCase() + emailName.slice(1) : 'Tú'));
    return {
      id: user?.id ?? 'me',
      name,
      initial: initial(name),
      color: profile?.color ?? '#FF6B4A',
      email,
      memberSince: user?.created_at ?? new Date().toISOString(),
      inviteCode: profile?.invite_code ?? '',
    };
  }, [user, profile]);
}

/** Wishes in the app's shape: owner and author relative to me. */
export function useWishesFromServer(): Wish[] {
  const userId = useAuth().session?.user.id;
  const { wishRows } = useSocial();
  return useMemo(
    () =>
      wishRows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        note: r.note ?? undefined,
        owner: r.for_id === null ? 'ambos' : r.for_id === userId ? 'yo' : 'pareja',
        done: r.done,
        progress: r.progress ?? undefined,
        addedBy: r.added_by === userId ? 'me' : r.added_by,
        createdAt: r.created_at,
      })),
    [wishRows, userId],
  );
}
