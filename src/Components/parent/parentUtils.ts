import type { ParentChild } from '../../types/parent';
import type { TimetableSlot } from '../../services/parent.services';

/**
 * A child's name for display; an unnamed record reads "Unnamed child".
 * (The name itself comes from `childFullName`, which owns the field fallbacks.)
 *
 * @param fullName - The result of `childFullName`.
 * @returns The name to show.
 */
export const displayName = (fullName: string): string => fullName || 'Unnamed child';

/**
 * "JSS 1 • Class A" — a child's grade and class on one line.
 *
 * @param child - The child, or nothing.
 * @returns The line, or a placeholder when neither is known.
 */
export const getChildMeta = (child: ParentChild | null | undefined): string =>
  [child?.grade, child?.className].filter(Boolean).join(' • ') || 'Class not assigned';

/**
 * The first letters of the first two words of a name, for an avatar fallback.
 *
 * @param name - The name.
 * @returns Up to two capital letters, or "C" for an empty name.
 */
export const getInitials = (name = ''): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'C';

/**
 * A timestamp as "Jun 12, 8:30 AM".
 *
 * @param value - An ISO timestamp, or nothing.
 * @returns The formatted time; the input unchanged when it is not a date.
 */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

/**
 * "08:00 - 08:45" for a timetable slot.
 *
 * @param slot - The slot, or nothing.
 * @returns The range.
 */
export const formatTimeRange = (slot: Pick<TimetableSlot, 'startTime' | 'endTime'> | null | undefined): string => {
  if (!slot) return '';
  return `${slot.startTime || ''} - ${slot.endTime || ''}`.trim();
};
