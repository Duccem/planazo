import type { IconName } from '@/components/ui/icon';
import type { ColorToken } from '@/theme/tokens';

import type { Category, CoverKey, PriceTier, Response, WishKind, WishOwner } from './types';

export const categories: Record<Category, { label: string; emoji: string; cover: CoverKey }> = {
  comida: { label: 'Comida', emoji: '🍷', cover: 'sunset' },
  aventura: { label: 'Aventura', emoji: '🧗', cover: 'dusk' },
  cultura: { label: 'Cultura', emoji: '🎭', cover: 'candy' },
  casa: { label: 'En casa', emoji: '🛋️', cover: 'night' },
  escapada: { label: 'Escapada', emoji: '🏕️', cover: 'forest' },
  deporte: { label: 'Deporte', emoji: '🚲', cover: 'sea' },
};

export const categoryList = Object.keys(categories) as Category[];

export const priceLabel = (p: PriceTier) => (p === 0 ? 'Gratis' : '$'.repeat(p));

export const responseMeta: Record<
  Response,
  { label: string; tone: 'indigo' | 'coral' | 'sun' | 'mint' | 'plain'; icon: IconName }
> = {
  pendiente: { label: 'Pendiente', tone: 'plain', icon: 'clock' },
  si: { label: '¡Va!', tone: 'mint', icon: 'check' },
  quizas: { label: 'Quizás', tone: 'sun', icon: 'clock' },
  no: { label: 'Paso', tone: 'coral', icon: 'x' },
};

export const wishKinds: Record<WishKind, { label: string; plural: string; icon: IconName; bg: ColorToken; fg: ColorToken }> = {
  regalo: { label: 'Regalo', plural: 'Regalos', icon: 'gift', bg: 'coralSoft', fg: 'coralDeep' },
  actividad: { label: 'Actividad', plural: 'Actividades', icon: 'sparkle', bg: 'lilac', fg: 'indigoDeep' },
  meta: { label: 'Meta', plural: 'Metas', icon: 'target', bg: 'sunSoft', fg: 'sunDeep' },
};

export const wishOwners: Record<WishOwner, string> = {
  ambos: 'Para los dos',
  yo: 'Para mí',
  pareja: 'Para mi pareja',
};
