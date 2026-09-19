import {
  Bell,
  BookOpen,
  CalendarCheck,
  CreditCard,
  FileText,
  GraduationCap,
  Megaphone,
  MessageSquareText,
  type LucideIcon,
} from 'lucide-react';
import type { NotificationCategoryKey } from '../../types/notifications';
import type { NotificationFilter } from '../../lib/notificationModel';

/** How one category looks: its label, its colours in both themes and its icon. */
export interface CategoryMeta {
  label: string;
  /** The unread dot. */
  dot: string;
  badge: string;
  iconWrap: string;
  Icon: LucideIcon;
}

/** One tab above the list. */
export interface NotificationTab {
  key: NotificationFilter;
  label: string;
}

/** The tabs, in order. Every other category is reachable through "All" and search. */
export const TABS: readonly NotificationTab[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'announcement', label: 'Announcements' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payments', label: 'Fee & Payments' },
];

// Written out in full (not built from a template) so Tailwind's scanner sees every class.
export const CATEGORY_META: Readonly<Record<NotificationCategoryKey, CategoryMeta>> = {
  announcement: {
    label: 'Announcement',
    dot: 'bg-blue-600',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    iconWrap: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    Icon: Megaphone,
  },
  attendance: {
    label: 'Attendance',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    iconWrap: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    Icon: CalendarCheck,
  },
  academics: {
    label: 'Academics',
    dot: 'bg-violet-600',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    iconWrap: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    Icon: BookOpen,
  },
  grading: {
    label: 'Results',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    iconWrap: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    Icon: GraduationCap,
  },
  payments: {
    label: 'Fee & Payments',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    iconWrap: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    Icon: CreditCard,
  },
  messages: {
    label: 'Messages',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    iconWrap: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    Icon: MessageSquareText,
  },
  resources: {
    label: 'Resources',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
    iconWrap: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
    Icon: FileText,
  },
  account: {
    label: 'Account',
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    iconWrap: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    Icon: Bell,
  },
  other: {
    label: 'Notification',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
    iconWrap: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
    Icon: Bell,
  },
};

/**
 * The label a parent sees for a category.
 *
 * @param category - The category key.
 * @returns Its label.
 */
export const categoryLabel = (category: NotificationCategoryKey): string => CATEGORY_META[category].label;
