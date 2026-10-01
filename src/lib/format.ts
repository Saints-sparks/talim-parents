/**
 * Display formatting for the portal: money, dates, ordinals, initials. Pure
 * functions, so screens and the receipt PDFs format the same way.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Naira without kobo, as the design writes it (₦30,000).
 *
 * @param amount - The amount in naira.
 * @returns e.g. `₦30,000`.
 */
export function naira(amount: number | null | undefined): string {
  return `₦${Math.round(Number(amount) || 0).toLocaleString('en-NG')}`;
}

/**
 * The parts of a `YYYY-MM-DD` (or ISO) date, read as a calendar day so a
 * timezone never moves it to the day before.
 *
 * @param value - The date.
 * @returns Year, month (0-based) and day, or `null` when unreadable.
 */
export function dayParts(value: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/**
 * A long date: "30 September 2026".
 *
 * @param value - `YYYY-MM-DD` or ISO.
 * @returns The date, or an em dash.
 */
export function longDate(value: string | null | undefined): string {
  const p = dayParts(value);
  return p ? `${p.d} ${MONTHS[p.m]} ${p.y}` : '—';
}

/**
 * A short date: "30 Sep 2026".
 *
 * @param value - `YYYY-MM-DD` or ISO.
 * @returns The date, or an em dash.
 */
export function shortDate(value: string | null | undefined): string {
  const p = dayParts(value);
  return p ? `${String(p.d).padStart(2, '0')} ${SHORT_MONTHS[p.m]} ${p.y}` : '—';
}

/**
 * Day and month only: "24 September".
 *
 * @param value - `YYYY-MM-DD` or ISO.
 * @returns The date, or an em dash.
 */
export function dayMonth(value: string | null | undefined): string {
  const p = dayParts(value);
  return p ? `${p.d} ${MONTHS[p.m]}` : '—';
}

/**
 * The weekday of a calendar day: "Thursday".
 *
 * @param value - `YYYY-MM-DD`.
 * @returns The weekday, or an empty string.
 */
export function weekdayOf(value: string | null | undefined): string {
  const p = dayParts(value);
  return p ? WEEKDAYS[new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay()] : '';
}

/**
 * The month heading: "September 2026".
 *
 * @param month - `YYYY-MM`.
 * @returns The heading.
 */
export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

/**
 * Moves a `YYYY-MM` month by some months.
 *
 * @param month - `YYYY-MM`.
 * @param delta - Months to move (negative for back).
 * @returns The new `YYYY-MM`.
 */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/**
 * The `YYYY-MM` of a date.
 *
 * @param value - `YYYY-MM-DD`, ISO, or a `Date`.
 * @returns The month.
 */
export function monthOf(value: string | Date): string {
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  return value.slice(0, 7);
}

/**
 * Today as `YYYY-MM-DD` in the device's timezone.
 *
 * @param now - The moment; now by default.
 * @returns The calendar day.
 */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * A date range for a leave request: "4 – 7 September · 2 days".
 *
 * @param start - `YYYY-MM-DD`.
 * @param end - `YYYY-MM-DD`.
 * @param days - School days covered.
 * @returns The range.
 */
export function leaveRange(start: string, end: string, days: number): string {
  const s = dayParts(start);
  const e = dayParts(end);
  if (!s) return 'Dates to be confirmed';
  const count = `${days} day${days === 1 ? '' : 's'}`;
  if (!e || start === end) return `${weekdayOf(start)} ${s.d} ${MONTHS[s.m]} · ${count}`;
  if (s.m === e.m && s.y === e.y) return `${s.d} – ${e.d} ${MONTHS[s.m]} · ${count}`;
  return `${s.d} ${MONTHS[s.m]} – ${e.d} ${MONTHS[e.m]} · ${count}`;
}

/**
 * An English ordinal: 1st, 2nd, 3rd, 11th, 22nd.
 *
 * @param n - The number.
 * @returns The ordinal.
 */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/**
 * Up to two initials of a name.
 *
 * @param name - A full name.
 * @returns e.g. "MA", or "?" for an empty name.
 */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * The first name of a full name.
 *
 * @param name - A full name.
 * @returns The first word.
 */
export function firstNameOf(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

/**
 * A percent for display: one decimal only when it has one.
 *
 * @param value - The percent, or null.
 * @returns "73.5%", "74%", or an em dash.
 */
export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

/**
 * "Today", "Yesterday", a weekday within the week, else "3 Sep".
 *
 * @param value - An ISO timestamp.
 * @param now - The moment to compare with.
 * @returns The relative label.
 */
export function relativeDay(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const startOf = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return WEEKDAYS[date.getDay()].slice(0, 3);
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/**
 * The top bar's date: "Fri, 18 Sep 2026".
 *
 * @param now - The moment; now by default.
 * @returns The date.
 */
export function topBarDate(now: Date = new Date()): string {
  return `${WEEKDAYS[now.getDay()].slice(0, 3)}, ${now.getDate()} ${SHORT_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}
