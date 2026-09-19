/**
 * Placeholder for the grid while the week loads.
 *
 * @returns The skeleton.
 */
export default function TimetableSkeleton() {
  return (
    <div
      className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading timetable…</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#EEF2F7] dark:bg-slate-800" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 16 }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-[#F4F7FB] dark:bg-slate-800/70" />
        ))}
      </div>
    </div>
  );
}
