/**
 * Dates comptables : chaînes ISO « YYYY-MM-DD » (jours) et « YYYY-MM » (mois),
 * toujours interprétées dans le fuseau horaire de l'utilisateur.
 */

export type DateKey = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function isValidDateKey(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(mo) - 1 && date.getUTCDate() === Number(d);
}

export function isValidMonthKey(value: string): boolean {
  const m = MONTH_RE.exec(value);
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
}

/** Date du jour dans un fuseau horaire IANA (ex. « Africa/Douala »). */
export function todayInTimezone(timezone: string, now: Date = new Date()): DateKey {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function monthOf(date: DateKey): MonthKey {
  return date.slice(0, 7);
}

export function dayOf(date: DateKey): number {
  return Number(date.slice(8, 10));
}

function parseMonth(month: MonthKey): { year: number; month: number } {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Mois invalide : ${month}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const { year, month: mo } = parseMonth(month);
  const index = year * 12 + (mo - 1) + delta;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

export function daysInMonth(month: MonthKey): number {
  const { year, month: mo } = parseMonth(month);
  return new Date(Date.UTC(year, mo, 0)).getUTCDate();
}

/** Bornes d'un mois : début inclus, fin exclue. */
export function monthRange(month: MonthKey): { start: DateKey; end: DateKey } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}

/** Liste des mois de `from` à `to` inclus. */
export function listMonths(from: MonthKey, to: MonthKey): MonthKey[] {
  const result: MonthKey[] = [];
  let current = from;
  let guard = 0;
  while (current <= to && guard < 1200) {
    result.push(current);
    current = addMonths(current, 1);
    guard += 1;
  }
  return result;
}

/** Les `count` derniers mois se terminant par `month` (inclus), du plus ancien au plus récent. */
export function lastMonths(month: MonthKey, count: number): MonthKey[] {
  return listMonths(addMonths(month, -(count - 1)), month);
}

export function compareDates(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDays(date: DateKey, days: number): DateKey {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const value = new Date(Date.UTC(y, m - 1, d + days));
  return value.toISOString().slice(0, 10);
}

/** Même jour dans un autre mois, borné au dernier jour du mois cible (31 → 30/28…). */
export function sameDayInMonth(day: number, month: MonthKey): DateKey {
  const clamped = Math.min(Math.max(1, day), daysInMonth(month));
  return `${month}-${String(clamped).padStart(2, '0')}`;
}

/**
 * Nombre de mois restants entre deux dates (mois entamés comptés comme entiers),
 * 0 si la date cible est passée ou égale.
 * Exemple : du 2026-11-09 au 2027-02-09 → 3 ; au 2027-02-10 → 4.
 */
export function monthsUntil(from: DateKey, to: DateKey): number {
  if (compareDates(to, from) <= 0) return 0;
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number];
  let months = (ty - fy) * 12 + (tm - fm);
  if (td > fd) months += 1;
  return Math.max(1, months);
}

export function formatMonthLabel(month: MonthKey, locale = 'fr-FR', style: 'long' | 'short' = 'long'): string {
  const { year, month: mo } = parseMonth(month);
  const label = new Intl.DateTimeFormat(locale, {
    month: style,
    year: style === 'long' ? 'numeric' : '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, mo - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDateLabel(date: DateKey, locale = 'fr-FR', withYear = true): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
