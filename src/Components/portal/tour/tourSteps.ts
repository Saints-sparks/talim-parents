/** One step of the "Getting started" tour (the design's tour sheet). */
export interface TourStep {
  title: string;
  body: string;
  /** Where "Go" takes the parent. */
  path: string;
  goLabel: string;
}

/**
 * The six steps of the design's tour, worded for this family.
 *
 * @param children - How many children are linked.
 * @param schools - How many schools they attend.
 * @returns The steps, in order.
 */
export function tourSteps(children: number, schools: number): TourStep[] {
  const family =
    children > 1
      ? `All ${children} of your children sit under this one login${schools > 1 ? `, across ${schools} schools` : ''}.`
      : 'Your child sits under this login, and any brother or sister you link later joins them here.';
  return [
    {
      title: 'One account, every child',
      body: `${family} The portal shows one child at a time so nothing gets mixed up. Switch from the name at the top of the page, or from Settings › Children.`,
      path: '/settings?tab=children',
      goLabel: 'Open Children',
    },
    {
      title: 'The dashboard tells you what needs you',
      body: "Four tiles cover average, position, attendance and fees. Below them, ‘Needs your attention’ lists only what is outstanding today: an unpaid balance, a dip in attendance, a report waiting to be signed.",
      path: '/dashboard',
      goLabel: 'Open Dashboard',
    },
    {
      title: 'Attendance, and asking for leave',
      body: 'Every school day is marked present, late, absent or on approved leave. Approved leave never counts against the attendance rate. Ask for leave ahead of time; you can still change or withdraw it while it is pending.',
      path: '/attendance',
      goLabel: 'Open Attendance',
    },
    {
      title: 'Results and the term report',
      body: 'Each subject shows its assessments and total. Sign the report once the school publishes it; the button then becomes Download term report. Past terms stay available from the term picker.',
      path: '/results',
      goLabel: 'Open Results',
    },
    {
      title: 'Fees and payments',
      body: 'Due fees can be paid in full or, where the school allows it, in part; one item or several at once. Cards are entered only on the payment provider’s page. Every payment produces a receipt you can download later.',
      path: '/payments',
      goLabel: 'Open Payments',
    },
    {
      title: 'Messages and alerts',
      body: 'Write to class teachers or the school office directly. Notifications tell you the same day a child is absent, when results are published and before a fee falls due; you choose which in Settings › Notifications.',
      path: '/messages',
      goLabel: 'Open Messages',
    },
  ];
}
