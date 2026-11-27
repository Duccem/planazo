const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function daysFromToday(iso: string) {
  const diff = startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86_400_000);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "Sáb 28 nov" */
export function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${cap(DAYS_SHORT[d.getDay()])} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Sáb 28 nov · 20:30" */
export function formatDateTime(iso: string) {
  return `${formatShortDate(iso)} · ${formatTime(iso)}`;
}

/** "Jueves 26 nov" */
export function formatToday() {
  const d = new Date();
  return `${cap(DAYS[d.getDay()])} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "hoy", "mañana", "en 3 días", "hace 2 días" */
export function relativeDay(iso: string) {
  const n = daysFromToday(iso);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  if (n > 1) return `en ${n} días`;
  return `hace ${-n} días`;
}

/** "hace 2 h", "hace 3 d" */
export function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function dayParts(d: Date) {
  return { weekday: cap(DAYS_SHORT[d.getDay()]), day: d.getDate(), month: MONTHS[d.getMonth()] };
}
