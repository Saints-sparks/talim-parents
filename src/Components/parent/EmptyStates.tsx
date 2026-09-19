import { Baby, CalendarX } from 'lucide-react';

/**
 * Shown on My Children when no child is linked to the account.
 *
 * @returns The empty state.
 */
export function EmptyChildrenState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#C9D7EA] bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <Baby className="mx-auto h-12 w-12 text-[#0A4EA3] dark:text-blue-300" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-extrabold text-[#101828] dark:text-slate-100">No children linked yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#667085] dark:text-slate-400">
        We couldn’t find any children linked to your account. Please contact your school administrator.
      </p>
    </div>
  );
}

/**
 * Shown on Timetable when the child has no published timetable.
 *
 * @returns The empty state.
 */
export function EmptyTimetableState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#C9D7EA] bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <CalendarX className="mx-auto h-12 w-12 text-[#0A4EA3] dark:text-blue-300" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-extrabold text-[#101828] dark:text-slate-100">No timetable available</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#667085] dark:text-slate-400">
        No timetable has been published for this child yet.
      </p>
    </div>
  );
}
