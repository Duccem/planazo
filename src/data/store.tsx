import { createContext, type ReactNode, use, useMemo, useReducer } from 'react';

import * as mock from './mock';
import type { Invitation, Person, Plan, Response, Wish } from './types';

// In-memory app state seeded with sample data. Swap for a real backend later:
// screens only talk to the hooks exported here.

type State = {
  plans: Plan[];
  invitations: Invitation[];
  wishes: Wish[];
  people: Person[];
};

type Action =
  | { type: 'plan/add'; plan: Plan }
  | { type: 'plan/update'; id: string; patch: Partial<Plan> }
  | { type: 'plan/remove'; id: string }
  | { type: 'plan/like'; id: string }
  | { type: 'plan/send'; id: string; personIds: string[] }
  | { type: 'invitation/respond'; id: string; response: Response }
  | { type: 'wish/add'; wish: Wish }
  | { type: 'wish/update'; id: string; patch: Partial<Wish> }
  | { type: 'wish/remove'; id: string };

function mapPlan(state: State, id: string, fn: (p: Plan) => Plan): State {
  return { ...state, plans: state.plans.map((p) => (p.id === id ? fn(p) : p)) };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'plan/add':
      return { ...state, plans: [action.plan, ...state.plans] };
    case 'plan/update':
      return mapPlan(state, action.id, (p) => ({ ...p, ...action.patch }));
    case 'plan/remove':
      return { ...state, plans: state.plans.filter((p) => p.id !== action.id) };
    case 'plan/like':
      return mapPlan(state, action.id, (p) => ({
        ...p,
        likedByMe: !p.likedByMe,
        likes: p.likes + (p.likedByMe ? -1 : 1),
      }));
    case 'plan/send':
      return mapPlan(state, action.id, (p) => {
        const already = new Set(p.sharedWith.map((s) => s.personId));
        const added = action.personIds
          .filter((id) => !already.has(id))
          .map((personId) => ({ personId, response: 'pendiente' as const }));
        return { ...p, inMyList: true, sharedWith: [...p.sharedWith, ...added] };
      });
    case 'invitation/respond': {
      const inv = state.invitations.find((i) => i.id === action.id);
      if (!inv) return state;
      const next = {
        ...state,
        invitations: state.invitations.map((i) =>
          i.id === action.id ? { ...i, myResponse: action.response } : i,
        ),
      };
      const accepted = action.response === 'si' || action.response === 'quizas';
      return mapPlan(next, inv.planId, (p) => ({
        ...p,
        inMyList: accepted,
        sharedWith: accepted
          ? p.sharedWith.some((s) => s.personId === inv.fromId)
            ? p.sharedWith
            : [{ personId: inv.fromId, response: 'si' }, ...p.sharedWith]
          : p.sharedWith,
      }));
    }
    case 'wish/add':
      return { ...state, wishes: [action.wish, ...state.wishes] };
    case 'wish/update':
      return {
        ...state,
        wishes: state.wishes.map((w) => (w.id === action.id ? { ...w, ...action.patch } : w)),
      };
    case 'wish/remove':
      return { ...state, wishes: state.wishes.filter((w) => w.id !== action.id) };
  }
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    plans: mock.plans,
    invitations: mock.invitations,
    wishes: mock.wishes,
    people: mock.people,
  });
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext value={value}>{children}</StoreContext>;
}

function useStore() {
  const ctx = use(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

let seq = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export type NewPlanInput = Pick<
  Plan,
  'title' | 'description' | 'category' | 'cover' | 'price' | 'place' | 'date' | 'isPublic' | 'durationLabel'
>;

export function useActions() {
  const { dispatch } = useStore();
  return useMemo(
    () => ({
      addPlan(input: NewPlanInput) {
        const id = newId('p');
        dispatch({
          type: 'plan/add',
          plan: { ...input, id, inMyList: true, likes: 0, sharedWith: [], createdAt: new Date().toISOString() },
        });
        return id;
      },
      updatePlan: (id: string, patch: Partial<Plan>) => dispatch({ type: 'plan/update', id, patch }),
      schedulePlan: (id: string, date: string | undefined) =>
        dispatch({ type: 'plan/update', id, patch: { date, done: false } }),
      markDone: (id: string, done = true) => dispatch({ type: 'plan/update', id, patch: { done } }),
      setSaved: (id: string, inMyList: boolean) => dispatch({ type: 'plan/update', id, patch: { inMyList } }),
      setPublic: (id: string, isPublic: boolean) => dispatch({ type: 'plan/update', id, patch: { isPublic } }),
      removePlan: (id: string) => dispatch({ type: 'plan/remove', id }),
      toggleLike: (id: string) => dispatch({ type: 'plan/like', id }),
      sendPlan: (id: string, personIds: string[]) => dispatch({ type: 'plan/send', id, personIds }),
      respond: (invitationId: string, response: Response) =>
        dispatch({ type: 'invitation/respond', id: invitationId, response }),
      addWish(input: Pick<Wish, 'kind' | 'title' | 'note' | 'owner'>) {
        dispatch({
          type: 'wish/add',
          wish: {
            ...input,
            id: newId('w'),
            done: false,
            progress: input.kind === 'meta' ? 0 : undefined,
            addedBy: 'me',
            createdAt: new Date().toISOString(),
          },
        });
      },
      updateWish: (id: string, patch: Partial<Wish>) => dispatch({ type: 'wish/update', id, patch }),
      removeWish: (id: string) => dispatch({ type: 'wish/remove', id }),
    }),
    [dispatch],
  );
}

/* ---------- Selectors ---------- */

export const useMe = () => mock.me;

export function usePeople() {
  return useStore().state.people;
}

export function usePartner() {
  return usePeople().find((p) => p.relation === 'pareja');
}

export function usePerson(id: string | undefined) {
  return usePeople().find((p) => p.id === id);
}

export function usePlan(id: string | undefined) {
  return useStore().state.plans.find((p) => p.id === id);
}

export function useMyPlans() {
  const { plans } = useStore().state;
  return useMemo(() => {
    const mine = plans.filter((p) => p.inMyList);
    const scheduled = mine
      .filter((p) => p.date && !p.done)
      .sort((a, b) => a.date!.localeCompare(b.date!));
    const someday = mine.filter((p) => !p.date && !p.done);
    const done = mine.filter((p) => p.done).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    return { scheduled, someday, done };
  }, [plans]);
}

export function useCommunityFeed() {
  const { plans } = useStore().state;
  return useMemo(() => plans.filter((p) => p.author), [plans]);
}

export function useInvitations() {
  const { invitations, plans } = useStore().state;
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
  return useStore().state.invitations.find((i) => i.planId === planId);
}

export function useWishes() {
  return useStore().state.wishes;
}
