/** Which badge a sidebar entry carries. */
export type NavBadgeKey = 'leave' | 'messages' | 'notifications' | 'payments';

/** One entry of the sidebar. */
export interface NavItem {
  path: string;
  label: string;
  /** Shown on hover, as the design's `title`. */
  tip: string;
  badge?: NavBadgeKey;
}

/** One labelled group of the sidebar. */
export interface NavGroup {
  /** `null` for the first group, which has no heading. */
  heading: string | null;
  items: NavItem[];
}

/** The sidebar, in the design's groups and order. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    heading: null,
    items: [
      { path: '/dashboard', label: 'Dashboard', tip: 'Today, at a glance' },
      { path: '/attendance', label: 'Attendance', tip: 'Present, late and absent days' },
      { path: '/timetable', label: 'Timetable', tip: 'The school week' },
    ],
  },
  {
    heading: 'Progress',
    items: [
      { path: '/results', label: 'Results', tip: 'Report card, grades and position' },
      { path: '/leave', label: 'Leave requests', tip: 'Tell the school about absences', badge: 'leave' },
    ],
  },
  {
    heading: 'School & you',
    items: [
      { path: '/messages', label: 'Messages', tip: 'Teachers and the school office', badge: 'messages' },
      { path: '/notifications', label: 'Notifications', tip: 'Announcements and alerts', badge: 'notifications' },
      { path: '/payments', label: 'Payments', tip: 'Fees, bills and receipts', badge: 'payments' },
    ],
  },
];

/** The settings entry at the foot of the sidebar. */
export const SETTINGS_ITEM: NavItem = { path: '/settings', label: 'Account & settings', tip: 'Your profile, alerts and security' };

/** What each badge means, for screen readers ("Messages, 3 unread"). */
export const BADGE_MEANING: Record<NavBadgeKey, string> = {
  leave: 'pending',
  messages: 'unread',
  notifications: 'unread',
  payments: 'with fees due',
};
