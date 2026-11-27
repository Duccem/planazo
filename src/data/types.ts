export type CoverKey = 'sunset' | 'sea' | 'clay' | 'dusk' | 'snow' | 'forest' | 'night' | 'candy';

export type Category = 'comida' | 'aventura' | 'cultura' | 'casa' | 'escapada' | 'deporte';

export type PriceTier = 0 | 1 | 2 | 3; // gratis, $, $$, $$$

export type Relation = 'pareja' | 'amigo';

export type Person = {
  id: string;
  name: string;
  initial: string;
  color: string;
  relation: Relation;
};

export type Response = 'pendiente' | 'si' | 'quizas' | 'no';

export type Author = {
  name: string;
  handle: string;
  initial: string;
  color: string;
};

/**
 * A plan can be:
 * - one of yours, or one you saved (inMyList)
 * - a community plan in the feed (author set)
 * - a plan someone sent you (see Invitation)
 */
export type Plan = {
  id: string;
  title: string;
  description: string;
  category: Category;
  cover: CoverKey;
  price: PriceTier;
  durationLabel?: string;
  place?: string;
  /** ISO date-time when it is scheduled. Undefined means "algún día". */
  date?: string;
  done?: boolean;
  /** In my plans list (created by me or saved from the community). */
  inMyList: boolean;
  /** Shared publicly to the community. */
  isPublic: boolean;
  /** Set for plans that come from the community. */
  author?: Author;
  likes: number;
  likedByMe?: boolean;
  /** Who I sent it to and what they answered. */
  sharedWith: { personId: string; response: Response }[];
  createdAt: string;
};

export type Invitation = {
  id: string;
  planId: string;
  fromId: string;
  note?: string;
  myResponse: Response;
  sentAt: string;
};

export type WishKind = 'regalo' | 'actividad' | 'meta';
export type WishOwner = 'ambos' | 'yo' | 'pareja';

export type Wish = {
  id: string;
  kind: WishKind;
  title: string;
  note?: string;
  owner: WishOwner;
  done: boolean;
  /** 0..1, only for goals. */
  progress?: number;
  addedBy: 'me' | string;
  createdAt: string;
};

export type Me = {
  name: string;
  initial: string;
  color: string;
  handle: string;
  inviteCode: string;
};
