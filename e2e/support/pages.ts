/**
 * Every screen in the parent sidebar (src/Components/portal/shell/navItems.ts)
 * and Settings, with its heading and text only the loaded screen shows for
 * Ada (the default child): seeded data, or the screen's empty state.
 */
export interface ScreenSpec {
  path: string;
  heading: RegExp;
  content: RegExp;
  slug: string;
}

export const PARENT_SCREENS: readonly ScreenSpec[] = [
  { path: '/dashboard', heading: /^Good \w+, Paul$/, content: /Here is how Ada is doing/, slug: 'dashboard' },
  { path: '/attendance', heading: /^Attendance$/, content: /present|No attendance/i, slug: 'attendance' },
  { path: '/timetable', heading: /^Timetable$/, content: /Mathematics|No lessons/, slug: 'timetable' },
  // The published Third Term 2025/2026 report card.
  { path: '/results', heading: /^Results$/, content: /Mathematics/, slug: 'results' },
  // Ada's seeded B9 requests: one pending, one declined.
  { path: '/leave', heading: /^Leave requests$/, content: /Pending|Declined/, slug: 'leave' },
  // Paul's "School office" thread.
  { path: '/messages', heading: /^Messages$/, content: /School office/, slug: 'messages' },
  { path: '/notifications', heading: /^Notifications$/, content: /published|Welcome|caught up/i, slug: 'notifications' },
  // Ada's fees: Term 1 Tuition part paid, Uniform and Games Kit due.
  { path: '/payments', heading: /^Payments$/, content: /Term 1 Tuition|Uniform and Games Kit/, slug: 'payments' },
  { path: '/settings', heading: /^Account & settings$/, content: /parent@e2e\.talim\.test|Paul Parent/, slug: 'settings' },
];
