/**
 * The date `days` days after (or before) another; the input is not mutated.
 *
 * @param date - The starting date.
 * @param days - How many days to add; negative goes back.
 * @returns The new date.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * The Monday of the week a date falls in, at local midnight.
 *
 * @param date - Any date in the week.
 * @returns That week's Monday.
 */
export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

/**
 * "Sep 14 - Sep 20, 2026" for the week starting on a date.
 *
 * @param weekStart - The week's Monday.
 * @returns The label.
 */
export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const format = (date: Date): string => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  return `${format(weekStart)} - ${format(end)}, ${end.getFullYear()}`;
}
