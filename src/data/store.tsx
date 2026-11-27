import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { FEED_PAGE, PlansProvider, usePlansState } from './plans';
import {
  SocialProvider,
  useMeFromServer,
  usePeopleFromServer,
  useSocialActions,
  useWishesFromServer,
} from './social';
import type { Plan } from './types';

export type { NewPlanInput } from './plans';

// Screens only talk to the hooks exported here. Everything is backed by Supabase:
// - ./social: profile, people (partner + friends) and wishes
// - ./plans:  plans, my list, likes and invitations

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <SocialProvider>
      <PlansProvider>{children}</PlansProvider>
    </SocialProvider>
  );
}

export function useActions() {
  const social = useSocialActions();
  const plans = usePlansState().actions;
  return useMemo(() => ({ ...social, ...plans }), [social, plans]);
}

/* ---------- Selectors ---------- */

/** The signed-in user (profile from Supabase). */
export const useMe = useMeFromServer;

export function usePeople() {
  return usePeopleFromServer();
}

export function usePartner() {
  return usePeople().find((p) => p.relation === 'pareja');
}

export function usePerson(id: string | undefined) {
  return usePeople().find((p) => p.id === id);
}

/** True until plans have been loaded once. */
export function usePlansLoading() {
  return usePlansState().loading;
}

export function usePlan(id: string | undefined) {
  return usePlansState().plans.find((p) => p.id === id);
}

export function useMyPlans() {
  const { plans } = usePlansState();
  return useMemo(() => {
    const mine = plans.filter((p) => p.inMyList);
    const scheduled = mine
      .filter((p) => p.date && !p.done)
      .sort((a, b) => a.date!.localeCompare(b.date!));
    const someday = mine.filter((p) => !p.date && !p.done).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const done = mine.filter((p) => p.done).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    return { scheduled, someday, done };
  }, [plans]);
}

/**
 * Paginated community feed: public plans by other people, newest first, in pages of FEED_PAGE.
 * `pages` keeps the load order so a UI can rank within a page without reshuffling what's on screen.
 */
export function useCommunityFeed() {
  const { plans, feed, actions } = usePlansState();
  const pages = useMemo(() => {
    const byId = new Map(plans.map((p) => [p.id, p]));
    const list = feed.ids
      .map((id) => byId.get(id))
      // A plan made private or deleted since it loaded drops out.
      .filter((p): p is Plan => !!p && p.isPublic && !!p.author);
    const out: Plan[][] = [];
    for (let i = 0; i < list.length; i += FEED_PAGE) out.push(list.slice(i, i + FEED_PAGE));
    return out;
  }, [plans, feed.ids]);

  return {
    pages,
    category: feed.category,
    hasMore: feed.hasMore,
    loadingMore: feed.loadingMore,
    error: feed.error,
    loadMore: actions.loadMoreFeed,
    setCategory: actions.setFeedCategory,
    refresh: actions.refresh,
  };
}

export function useInvitations() {
  const { invitations, plans } = usePlansState();
  return useMemo(() => {
    const withPlan = invitations
      .map((inv) => ({ ...inv, plan: plans.find((p) => p.id === inv.planId)! }))
      .filter((i) => i.plan);
    return {
      pending: withPlan.filter((i) => i.myResponse === 'pendiente'),
      answered: withPlan.filter((i) => i.myResponse !== 'pendiente'),
    };
  }, [invitations, plans]);
}

export function useInvitationForPlan(planId: string | undefined) {
  return usePlansState().invitations.find((i) => i.planId === planId);
}

export function useWishes() {
  return useWishesFromServer();
}
