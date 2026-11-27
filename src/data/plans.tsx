import { randomUUID } from 'expo-crypto';
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';
import type { Invitation, Plan, PriceTier, Response } from './types';

/*
 * Plans, my list, likes and invitations, backed by Supabase.
 *
 * Every action updates local state first, then writes to the server. If the server refuses,
 * the user sees an alert and the state is reloaded from the server (the source of truth).
 * Realtime reloads when proposals arrive or someone answers one of mine.
 */

const PLAN_COLUMNS =
  'id, owner_id, title, description, category, cover, price, duration_label, place, is_public, likes_count, created_at, owner:profiles!plans_owner_id_fkey(id, name, color)';

type PlanRow = Pick<
  Tables<'plans'>,
  | 'id'
  | 'owner_id'
  | 'title'
  | 'description'
  | 'category'
  | 'cover'
  | 'price'
  | 'duration_label'
  | 'place'
  | 'is_public'
  | 'likes_count'
  | 'created_at'
> & { owner: Pick<Tables<'profiles'>, 'id' | 'name' | 'color'> | null };

type State = { plans: Plan[]; invitations: Invitation[]; loading: boolean };

export type NewPlanInput = Pick<
  Plan,
  'title' | 'description' | 'category' | 'cover' | 'price' | 'place' | 'date' | 'isPublic' | 'durationLabel'
>;

type PlanActions = {
  addPlan: (input: NewPlanInput) => string;
  schedulePlan: (id: string, date: string | undefined) => void;
  markDone: (id: string, done?: boolean) => void;
  setSaved: (id: string, inMyList: boolean) => void;
  setPublic: (id: string, isPublic: boolean) => void;
  removePlan: (id: string) => void;
  toggleLike: (id: string) => void;
  sendPlan: (id: string, personIds: string[], note?: string) => void;
  respond: (invitationId: string, response: Response) => void;
  refresh: () => Promise<void>;
};

const PlansContext = createContext<(State & { actions: PlanActions }) | null>(null);

function toPlan(row: PlanRow, me: string): Plan {
  const mine = row.owner_id === me;
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    category: row.category,
    cover: row.cover,
    price: row.price as PriceTier,
    durationLabel: row.duration_label ?? undefined,
    place: row.place ?? undefined,
    isPublic: row.is_public,
    likes: row.likes_count,
    createdAt: row.created_at,
    author: mine
      ? undefined
      : {
          id: row.owner_id,
          name: row.owner?.name ?? 'Alguien',
          initial: (row.owner?.name ?? 'A')[0].toUpperCase(),
          color: row.owner?.color ?? '#6B6890',
        },
    inMyList: false,
    sharedWith: [],
  };
}

export function PlansProvider({ children }: { children: ReactNode }) {
  const userId = useAuth().session?.user.id;
  // Remounting per user starts from a clean state on sign-out or account switch.
  return (
    <UserPlansProvider key={userId ?? 'signed-out'} userId={userId}>
      {children}
    </UserPlansProvider>
  );
}

function UserPlansProvider({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  const [state, setState] = useState<State>({ plans: [], invitations: [], loading: true });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [mine, feed, received, sent, likes] = await Promise.all([
      supabase.from('my_plans').select(`scheduled_at, done, plan:plans(${PLAN_COLUMNS})`).eq('user_id', userId),
      supabase
        .from('plans')
        .select(PLAN_COLUMNS)
        .eq('is_public', true)
        .neq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('invitations')
        .select(`id, plan_id, from_id, note, response, sent_at, plan:plans(${PLAN_COLUMNS})`)
        .eq('to_id', userId)
        .order('sent_at', { ascending: false }),
      supabase.from('invitations').select('plan_id, to_id, response').eq('from_id', userId),
      supabase.from('plan_likes').select('plan_id').eq('user_id', userId),
    ]);

    const failed = [mine, feed, received, sent, likes].find((r) => r.error);
    if (failed?.error) {
      // Keep what we had; the next refresh (foreground, realtime) will try again.
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const byId = new Map<string, Plan>();
    const add = (row: PlanRow | null) => {
      if (row && !byId.has(row.id)) byId.set(row.id, toPlan(row, userId));
    };
    feed.data?.forEach((r) => add(r as PlanRow));
    received.data?.forEach((r) => add(r.plan as PlanRow | null));
    mine.data?.forEach((r) => add(r.plan as PlanRow | null));

    for (const m of mine.data ?? []) {
      const plan = m.plan && byId.get((m.plan as PlanRow).id);
      if (plan) Object.assign(plan, { inMyList: true, date: m.scheduled_at ?? undefined, done: m.done });
    }
    const liked = new Set(likes.data?.map((l) => l.plan_id));
    for (const plan of byId.values()) plan.likedByMe = liked.has(plan.id);
    for (const s of sent.data ?? []) {
      byId.get(s.plan_id)?.sharedWith.push({ personId: s.to_id, response: s.response });
    }
    // Whoever invited me is "in" on plans I accepted.
    for (const i of received.data ?? []) {
      const plan = byId.get(i.plan_id);
      if (plan && (i.response === 'si' || i.response === 'quizas') && !plan.sharedWith.some((x) => x.personId === i.from_id)) {
        plan.sharedWith.unshift({ personId: i.from_id, response: 'si' });
      }
    }

    setState({
      plans: [...byId.values()],
      invitations: (received.data ?? [])
        .filter((i) => i.plan)
        .map((i) => ({
          id: i.id,
          planId: i.plan_id,
          fromId: i.from_id,
          note: i.note ?? undefined,
          myResponse: i.response,
          sentAt: i.sent_at,
        })),
      loading: false,
    });
  }, [userId]);

  // First load once realtime is subscribed (and again on every reconnect, or if it's unavailable).
  useEffect(() => {
    if (!userId) return;
    const reload = () => void refresh();
    const channel = supabase
      .channel(`plans:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `to_id=eq.${userId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `from_id=eq.${userId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'my_plans', filter: `user_id=eq.${userId}` }, reload)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reload();
      });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload();
    });
    return () => {
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const actions = useMemo<PlanActions>(() => {
    const patchPlan = (id: string, fn: (p: Plan) => Partial<Plan>) =>
      setState((s) => ({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) }));

    /** Run server writes in order; on the first error, tell the user and resync. */
    const persist = (...steps: (() => PromiseLike<{ error: { message: string } | null }>)[]) => {
      void (async () => {
        for (const step of steps) {
          const { error } = await step();
          if (error) {
            Alert.alert('No se pudo guardar', 'Comprueba tu conexión e inténtalo de nuevo.');
            await refresh();
            return;
          }
        }
      })();
    };

    const ensureInList = (planId: string) => () =>
      supabase
        .from('my_plans')
        .upsert({ user_id: userId!, plan_id: planId }, { onConflict: 'user_id,plan_id', ignoreDuplicates: true });

    return {
      refresh,

      addPlan(input) {
        const id = randomUUID();
        const now = new Date().toISOString();
        setState((s) => ({
          ...s,
          plans: [
            { ...input, id, ownerId: userId!, inMyList: true, likes: 0, sharedWith: [], createdAt: now },
            ...s.plans,
          ],
        }));
        persist(
          () =>
            supabase.from('plans').insert({
              id,
              title: input.title,
              description: input.description,
              category: input.category,
              cover: input.cover,
              price: input.price,
              place: input.place ?? null,
              duration_label: input.durationLabel ?? null,
              is_public: input.isPublic,
            }),
          // A trigger already put it in my list; only the date is left.
          ...(input.date
            ? [
                () =>
                  supabase
                    .from('my_plans')
                    .update({ scheduled_at: input.date })
                    .eq('user_id', userId!)
                    .eq('plan_id', id),
              ]
            : []),
        );
        return id;
      },

      schedulePlan(id, date) {
        patchPlan(id, () => ({ date, done: false, inMyList: true }));
        persist(() =>
          supabase
            .from('my_plans')
            .upsert(
              { user_id: userId!, plan_id: id, scheduled_at: date ?? null, done: false },
              { onConflict: 'user_id,plan_id' },
            ),
        );
      },

      markDone(id, done = true) {
        patchPlan(id, () => ({ done }));
        persist(() => supabase.from('my_plans').update({ done }).eq('user_id', userId!).eq('plan_id', id));
      },

      setSaved(id, inMyList) {
        patchPlan(id, () => (inMyList ? { inMyList } : { inMyList, date: undefined, done: false }));
        persist(
          inMyList
            ? ensureInList(id)
            : () => supabase.from('my_plans').delete().eq('user_id', userId!).eq('plan_id', id),
        );
      },

      setPublic(id, isPublic) {
        patchPlan(id, () => ({ isPublic }));
        persist(() => supabase.from('plans').update({ is_public: isPublic }).eq('id', id));
      },

      removePlan(id) {
        setState((s) => ({
          ...s,
          plans: s.plans.filter((p) => p.id !== id),
          invitations: s.invitations.filter((i) => i.planId !== id),
        }));
        persist(() => supabase.from('plans').delete().eq('id', id));
      },

      toggleLike(id) {
        const plan = stateRef.current.plans.find((p) => p.id === id);
        if (!plan) return;
        const like = !plan.likedByMe;
        patchPlan(id, (p) => ({ likedByMe: like, likes: Math.max(0, p.likes + (like ? 1 : -1)) }));
        persist(() =>
          like
            ? supabase.from('plan_likes').insert({ plan_id: id })
            : supabase.from('plan_likes').delete().eq('user_id', userId!).eq('plan_id', id),
        );
      },

      sendPlan(id, personIds, note) {
        const plan = stateRef.current.plans.find((p) => p.id === id);
        if (!plan) return;
        const already = new Set(plan.sharedWith.map((s) => s.personId));
        const fresh = personIds.filter((pid) => !already.has(pid));
        if (!fresh.length) return;
        patchPlan(id, (p) => ({
          inMyList: true,
          sharedWith: [...p.sharedWith, ...fresh.map((personId) => ({ personId, response: 'pendiente' as const }))],
        }));
        persist(
          // Invitations require the plan to be in my list.
          ensureInList(id),
          () =>
            supabase
              .from('invitations')
              .upsert(
                fresh.map((to_id) => ({ plan_id: id, to_id, note: note ?? null })),
                { onConflict: 'plan_id,to_id', ignoreDuplicates: true },
              ),
        );
      },

      respond(invitationId, response) {
        const inv = stateRef.current.invitations.find((i) => i.id === invitationId);
        if (!inv) return;
        const accepted = response === 'si' || response === 'quizas';
        setState((s) => ({
          ...s,
          invitations: s.invitations.map((i) => (i.id === invitationId ? { ...i, myResponse: response } : i)),
          plans: s.plans.map((p) =>
            p.id === inv.planId && response !== 'pendiente' && p.ownerId !== userId
              ? {
                  ...p,
                  inMyList: accepted,
                  sharedWith:
                    accepted && !p.sharedWith.some((x) => x.personId === inv.fromId)
                      ? [{ personId: inv.fromId, response: 'si' as const }, ...p.sharedWith]
                      : p.sharedWith,
                }
              : p,
          ),
        }));
        persist(() => supabase.rpc('respond_to_invitation', { invitation: invitationId, answer: response }));
      },
    };
  }, [userId, refresh]);

  const value = useMemo(() => ({ ...state, actions }), [state, actions]);
  return <PlansContext value={value}>{children}</PlansContext>;
}

export function usePlansState() {
  const ctx = use(PlansContext);
  if (!ctx) throw new Error('usePlansState must be used inside <PlansProvider>');
  return ctx;
}
