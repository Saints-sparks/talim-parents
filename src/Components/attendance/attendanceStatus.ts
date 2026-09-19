import { CheckCircle2, CircleMinus, Clock3, Info, XCircle } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AttendanceCalendarDay } from '../../services/attendance.services';

/** Presentation for one attendance status. */
export interface StatusMeta {
  label: string;
  color: string;
  dot: string;
  soft: string;
  badge: string;
  border: string;
  icon: ComponentType<{ className?: string }>;
}

/** The status a day carries, as the API names it. */
export type AttendanceStatusKey = AttendanceCalendarDay['status'];

/** The four statuses that get a summary card and a legend entry. */
export type TallyKey = 'present' | 'absent' | 'late' | 'noClass';

/** How each status looks, in both themes. */
export const STATUS_META: Record<AttendanceStatusKey, StatusMeta> = {
  present: {
    label: 'Present',
    color: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    icon: CheckCircle2,
  },
  absent: {
    label: 'Absent',
    color: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
    soft: 'bg-red-50 dark:bg-red-950/40',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    border: 'border-red-100 dark:border-red-900/50',
    icon: XCircle,
  },
  late: {
    label: 'Late',
    color: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
    soft: 'bg-orange-50 dark:bg-orange-950/40',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    border: 'border-orange-100 dark:border-orange-900/50',
    icon: Clock3,
  },
  noClass: {
    label: 'No Class',
    color: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400',
    soft: 'bg-slate-50 dark:bg-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    border: 'border-slate-100 dark:border-slate-800',
    icon: CircleMinus,
  },
  noRecord: {
    label: 'No Record',
    color: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-300',
    soft: 'bg-slate-50 dark:bg-slate-800',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    border: 'border-slate-100 dark:border-slate-800',
    icon: Info,
  },
};

/** The four tallies, in display order. */
export const TALLY_KEYS: readonly TallyKey[] = ['present', 'absent', 'late', 'noClass'];

/**
 * The look for a status, tolerating one the API adds later.
 *
 * @param status - The status the API sent.
 * @returns Its presentation, or the "No Record" one for an unknown status.
 */
export function metaFor(status: string | undefined): StatusMeta {
  return STATUS_META[status as AttendanceStatusKey] ?? STATUS_META.noRecord;
}
