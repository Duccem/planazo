import { randomUUID } from 'expo-crypto';
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { avatarUrl } from '@/lib/avatars';
import type { Tables } from '@/lib/database.types';
import { MAX_PHOTOS_PER_PLAN, type PickedPhoto, removePhotoFiles, signPhotoUrls, uploadPhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';
import type { Category, Invitation, Plan, PlanPhoto, PriceTier, Response } from './types';

/*
 * Plans, my list, likes and invitations, backed by Supabase.
 *
 * Every action updates local state first, then writes to the server. If the server refuses,
 * the user sees an alert and the state is reloaded from the server (the source of truth).
 * Realtime reloads when proposals arrive or someone answers one of mine.
 */

const PLAN_COLUMNS =
  'id, owner_id, title, description, category, cover, price, duration_label, place, is_public, likes_count, created_at, owner:profiles!plans_owner_id_fkey(id, name, color, avatar_path), photos:plan_photos(id, path, position, width, height)';

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
> & {
  owner: Pick<Tables<'profiles'>, 'id' | 'name' | 'color' | 'avatar_path'> | null;
  photos: Pick<Tables<'plan_photos'>, 'id' | 'path' | 'position' | 'width' | 'height'>[] | null;
};

/** Community feed page size. */
export const FEED_PAGE = 20;

/** The community feed: ids in load order (newest first), one category or all. */
export type FeedState = {
  category: Category | null;
  ids: string[];
  hasMore: boolean;
  loadingMore: boolean;
  /** Last page failed to load; the UI offers a retry. */
  error: boolean;
};

type State = { plans: Plan[]; invitations: Invitation[]; feed: FeedState; loading: boolean };

const initialFeed: FeedState = { category: null, ids: [], hasMore: true, loadingMore: true, error: false };

export type NewPlanInput = Pick<
  Plan,
  'title' | 'description' | 'category' | 'cover' | 'price' | 'place' | 'date' | 'isPublic' | 'durationLabel'
>;

type PlanActions = {
  /** Creates the plan (and uploads its photos, if any, once it exists). Returns its id right away. */
  addPlan: (input: NewPlanInput, photos?: PickedPhoto[]) => string;
  schedulePlan: (id: string, date: string | undefined) => void;
  markDone: (id: string, done?: boolean) => void;
  setSaved: (id: string, inMyList: boolean) => void;
  setPublic: (id: string, isPublic: boolean) => void;
  removePlan: (id: string) => void;
  toggleLike: (id: string) => void;
  sendPlan: (id: string, personIds: string[], note?: string) => void;
  respond: (invitationId: string, response: Response) => void;
  refresh: () => Promise<void>;
  /** Load the next feed page (no-op while loading or at the end). */
  loadMoreFeed: () => void;
  /** Switch the feed to one category (or all) and load its first page. */
  setFeedCategory: (category: Category | null) => void;
  /** Upload photos to a plan I own (appended; the first photo of a plan is its cover). */
  addPhotos: (planId: string, photos: PickedPhoto[]) => void;
  removePhoto: (planId: string, photoId: string) => void;
  /** Move a photo to the front so it becomes the cover. */
  setCoverPhoto: (planId: string, photoId: string) => void;
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
          avatarUrl: avatarUrl(row.owner?.avatar_path),
        },
    photos: [...(row.photos ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ph) => ({ id: ph.id, path: ph.path, width: ph.width ?? undefined, height: ph.height ?? undefined })),
    inMyList: false,
    sharedWith: [],
  };
}

/** Fill in signed URLs for every photo of these plans (one request). */
async function withSignedPhotos(plans: Plan[]) {
  const urls = await signPhotoUrls(plans.flatMap((p) => p.photos.map((ph) => ph.path)));
  for (const plan of plans) plan.photos = plan.photos.map((ph) => ({ ...ph, url: urls.get(ph.path) }));
}

/** Photos still uploading from this device survive a refresh that doesn't know about them yet. */
function keepPending(next: Plan, prev: Plan | undefined): Plan {
  const pending = prev?.photos.filter((ph) => ph.pending && !next.photos.some((n) => n.id === ph.id)) ?? [];
  return pending.length ? { ...next, photos: [...next.photos, ...pending] } : next;
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
  const [state, setState] = useState<State>({ plans: [], invitations: [], feed: initialFeed, loading: true });
  const stateRef = useRef(state);
  /** Pending "create plan" writes, so photo uploads for a brand-new plan wait for it. */
  const planWrites = useRef(new Map<string, Promise<boolean>>());
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * One page of public plans by other people, newest first. Keyset pagination on
   * (created_at, id): stable while new plans are published, unlike an offset.
   */
  const fetchFeed = useCallback(
    (category: Category | null, after: Plan | undefined, limit: number) => {
      let q = supabase.from('plans').select(PLAN_COLUMNS).eq('is_public', true).neq('owner_id', userId!);
      if (category) q = q.eq('category', category);
      if (after) {
        q = q.or(`created_at.lt."${after.createdAt}",and(created_at.eq."${after.createdAt}",id.lt.${after.id})`);
      }
      return q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    // Reload the feed for the current category, as far as it was scrolled.
    const feedCategory = stateRef.current.feed.category;
    const feedLimit = Math.max(FEED_PAGE, stateRef.current.feed.ids.length);
    const [mine, feed, received, sent, likes] = await Promise.all([
      supabase.from('my_plans').select(`scheduled_at, done, plan:plans(${PLAN_COLUMNS})`).eq('user_id', userId),
      fetchFeed(feedCategory, undefined, feedLimit),
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
      // Keep what we had; the next refresh (foreground, realtime, pull) will try again.
      setState((s) => ({ ...s, loading: false, feed: { ...s.feed, loadingMore: false } }));
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
    await withSignedPhotos([...byId.values()]);

    setState((prev) => {
      // If the category changed while this was loading, keep the newer feed (and its plans).
      const sameFeed = prev.feed.category === feedCategory;
      if (!sameFeed) {
        for (const id of prev.feed.ids) {
          const kept = prev.plans.find((p) => p.id === id);
          if (kept && !byId.has(id)) byId.set(id, kept);
        }
      }
      const feedIds = (feed.data ?? []).map((r) => r.id);
      const prevById = new Map(prev.plans.map((p) => [p.id, p]));
      return {
      plans: [...byId.values()].map((p) => keepPending(p, prevById.get(p.id))),
      feed: sameFeed
        ? { ...prev.feed, ids: feedIds, hasMore: feedIds.length === feedLimit, loadingMore: false, error: false }
        : prev.feed,
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
      };
    });
  }, [userId, fetchFeed]);

  /** Fetch a feed page, attach my likes, and merge it if the category is still current. */
  const loadFeedPage = useCallback(
    async (category: Category | null, after: Plan | undefined) => {
      const page = await fetchFeed(category, after, FEED_PAGE);
      const ids = (page.data ?? []).map((r) => r.id);
      const likes = ids.length
        ? await supabase.from('plan_likes').select('plan_id').eq('user_id', userId!).in('plan_id', ids)
        : { data: [], error: null };
      const pagePlans = ((page.data ?? []) as PlanRow[]).map((r) => toPlan(r, userId!));
      await withSignedPhotos(pagePlans);

      setState((s) => {
        if (s.feed.category !== category) return s; // switched filter meanwhile
        if (page.error || likes.error) return { ...s, feed: { ...s.feed, loadingMore: false, error: true } };
        const liked = new Set(likes.data?.map((l) => l.plan_id));
        const known = new Set(s.plans.map((p) => p.id));
        // Plans already loaded (e.g. in my list) keep their richer state.
        const fresh = pagePlans
          .filter((p) => !known.has(p.id))
          .map((p) => ({ ...p, likedByMe: liked.has(p.id) }));
        const base = after ? s.feed.ids : [];
        const seen = new Set(base);
        return {
          ...s,
          plans: [...s.plans, ...fresh],
          feed: {
            ...s.feed,
            ids: [...base, ...ids.filter((id) => !seen.has(id))],
            hasMore: ids.length === FEED_PAGE,
            loadingMore: false,
            error: false,
          },
        };
      });
    },
    [fetchFeed, userId],
  );

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

    /** Run server writes in order; on the first error, tell the user and resync. Resolves to success. */
    const persist = (...steps: (() => PromiseLike<{ error: { message: string } | null }>)[]) =>
      (async () => {
        for (const step of steps) {
          const { error } = await step();
          if (error) {
            Alert.alert('No se pudo guardar', 'Comprueba tu conexión e inténtalo de nuevo.');
            await refresh();
            return false;
          }
        }
        return true;
      })();

    const ensureInList = (planId: string) => () =>
      supabase
        .from('my_plans')
        .upsert({ user_id: userId!, plan_id: planId }, { onConflict: 'user_id,plan_id', ignoreDuplicates: true });

    /** Local placeholders shown while photos upload. */
    const localPhotos = (batch: PickedPhoto[]): PlanPhoto[] =>
      batch.map((ph, i) => ({
        id: `local-${Date.now()}-${i}`,
        path: '',
        url: ph.uri,
        width: ph.width,
        height: ph.height,
        pending: true,
      }));

    /** Upload photos one by one, swapping each placeholder for the real photo (or dropping it on failure). */
    const uploadBatch = (planId: string, batch: PickedPhoto[], temps: PlanPhoto[]) => {
      const replace = (tempId: string, next: PlanPhoto | null) =>
        patchPlan(planId, (p) => ({
          photos: next ? p.photos.map((x) => (x.id === tempId ? next : x)) : p.photos.filter((x) => x.id !== tempId),
        }));

      void (async () => {
        if ((await planWrites.current.get(planId)) === false) return;
        let position = Date.now(); // increasing, so new photos go after existing ones
        let failed = 0;
        for (const [i, photo] of batch.entries()) {
          const tempId = temps[i].id;
          const { id, path, error } = await uploadPhoto(planId, photo);
          if (error) {
            failed++;
            replace(tempId, null);
            continue;
          }
          const row = await supabase.from('plan_photos').insert({
            id,
            plan_id: planId,
            path,
            position: position++,
            width: photo.width,
            height: photo.height,
          });
          if (row.error) {
            failed++;
            void removePhotoFiles([path]);
            replace(tempId, null);
            continue;
          }
          // Keep showing the local file (already decoded) under the real id and path.
          replace(tempId, { id, path, url: photo.uri, width: photo.width, height: photo.height });
        }
        if (failed) {
          Alert.alert(
            failed === batch.length ? 'No se pudieron subir las fotos' : `No se pudieron subir ${failed} fotos`,
            'Comprueba tu conexión e inténtalo de nuevo.',
          );
        }
      })();
    };

    return {
      refresh,

      loadMoreFeed() {
        const { feed, plans } = stateRef.current;
        if (feed.loadingMore || !feed.hasMore) return;
        const last = plans.find((p) => p.id === feed.ids[feed.ids.length - 1]);
        const next = { ...feed, loadingMore: true, error: false };
        // Update the ref now so fast repeated end-reached events don't fire duplicate requests.
        stateRef.current = { ...stateRef.current, feed: next };
        setState((s) => ({ ...s, feed: { ...s.feed, loadingMore: true, error: false } }));
        void loadFeedPage(feed.category, last);
      },

      setFeedCategory(category) {
        if (stateRef.current.feed.category === category) return;
        const next: FeedState = { category, ids: [], hasMore: true, loadingMore: true, error: false };
        stateRef.current = { ...stateRef.current, feed: next };
        setState((s) => ({ ...s, feed: next }));
        void loadFeedPage(category, undefined);
      },

      addPlan(input, photos = []) {
        const id = randomUUID();
        const now = new Date().toISOString();
        const batch = photos.slice(0, MAX_PHOTOS_PER_PLAN);
        const temps = localPhotos(batch);
        setState((s) => ({
          ...s,
          plans: [
            { ...input, id, ownerId: userId!, photos: temps, inMyList: true, likes: 0, sharedWith: [], createdAt: now },
            ...s.plans,
          ],
        }));
        // Photos added right after creating wait for the plan to exist (storage checks ownership).
        planWrites.current.set(id, persist(
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
        ));
        if (batch.length) uploadBatch(id, batch, temps);
        return id;
      },

      schedulePlan(id, date) {
        patchPlan(id, () => ({ date, done: false, inMyList: true }));
        void persist(() =>
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
        void persist(() => supabase.from('my_plans').update({ done }).eq('user_id', userId!).eq('plan_id', id));
      },

      setSaved(id, inMyList) {
        patchPlan(id, () => (inMyList ? { inMyList } : { inMyList, date: undefined, done: false }));
        void persist(
          inMyList
            ? ensureInList(id)
            : () => supabase.from('my_plans').delete().eq('user_id', userId!).eq('plan_id', id),
        );
      },

      setPublic(id, isPublic) {
        patchPlan(id, () => ({ isPublic }));
        void persist(() => supabase.from('plans').update({ is_public: isPublic }).eq('id', id));
      },

      removePlan(id) {
        const paths = stateRef.current.plans.find((p) => p.id === id)?.photos.map((ph) => ph.path) ?? [];
        setState((s) => ({
          ...s,
          plans: s.plans.filter((p) => p.id !== id),
          invitations: s.invitations.filter((i) => i.planId !== id),
        }));
        // Files first: once the plan row is gone, storage no longer sees me as its owner.
        void persist(
          ...(paths.filter(Boolean).length ? [() => removePhotoFiles(paths.filter(Boolean))] : []),
          () => supabase.from('plans').delete().eq('id', id),
        );
      },

      addPhotos(planId, picked) {
        const plan = stateRef.current.plans.find((p) => p.id === planId);
        if (!plan || plan.ownerId !== userId) return;
        const room = MAX_PHOTOS_PER_PLAN - plan.photos.length;
        const batch = picked.slice(0, Math.max(0, room));
        if (!batch.length) return;

        const temps = localPhotos(batch);
        patchPlan(planId, (p) => ({ photos: [...p.photos, ...temps] }));
        uploadBatch(planId, batch, temps);
      },

      removePhoto(planId, photoId) {
        const photo = stateRef.current.plans.find((p) => p.id === planId)?.photos.find((ph) => ph.id === photoId);
        if (!photo || photo.pending) return;
        patchPlan(planId, (p) => ({ photos: p.photos.filter((ph) => ph.id !== photoId) }));
        void persist(
          () => supabase.from('plan_photos').delete().eq('id', photoId),
          () => removePhotoFiles([photo.path]),
        );
      },

      setCoverPhoto(planId, photoId) {
        const plan = stateRef.current.plans.find((p) => p.id === planId);
        const photo = plan?.photos.find((ph) => ph.id === photoId);
        if (!plan || !photo || photo.pending || plan.photos[0]?.id === photoId) return;
        patchPlan(planId, (p) => ({ photos: [photo, ...p.photos.filter((ph) => ph.id !== photoId)] }));
        // Any value lower than the current first one works; a negative timestamp always is.
        void persist(() => supabase.from('plan_photos').update({ position: -Date.now() }).eq('id', photoId));
      },

      toggleLike(id) {
        const plan = stateRef.current.plans.find((p) => p.id === id);
        if (!plan) return;
        const like = !plan.likedByMe;
        patchPlan(id, (p) => ({ likedByMe: like, likes: Math.max(0, p.likes + (like ? 1 : -1)) }));
        void persist(() =>
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
        void persist(
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
        void persist(() => supabase.rpc('respond_to_invitation', { invitation: invitationId, answer: response }));
      },
    };
  }, [userId, refresh, loadFeedPage]);

  const value = useMemo(() => ({ ...state, actions }), [state, actions]);
  return <PlansContext value={value}>{children}</PlansContext>;
}

export function usePlansState() {
  const ctx = use(PlansContext);
  if (!ctx) throw new Error('usePlansState must be used inside <PlansProvider>');
  return ctx;
}
