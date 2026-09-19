import { LuBookText } from 'react-icons/lu';

/**
 * The placeholder for the results grid while the first fetch is in flight.
 *
 * @returns The skeleton.
 */
export function ResultsLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-busy="true">
      <span className="sr-only">Loading results…</span>
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-20 min-w-[140px] flex-1 rounded-xl bg-gray-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-10 w-full max-w-sm rounded-lg bg-gray-200 dark:bg-slate-800" />
      <div className="h-64 rounded-xl bg-gray-200 dark:bg-slate-800" />
    </div>
  );
}

/**
 * What the tabs show when the school has published nothing for the term.
 *
 * @param props - Component props.
 * @param props.termSelected - Whether a term is chosen (changes the wording).
 * @returns The empty state.
 */
export function EmptyResultsState({ termSelected }: { termSelected: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <LuBookText className="mb-4 text-5xl text-gray-300 dark:text-slate-600" aria-hidden="true" />
      <h3 className="mb-2 text-lg font-semibold text-gray-600 dark:text-slate-300">No results available yet</h3>
      <p className="max-w-sm text-sm text-gray-400 dark:text-slate-500">
        {termSelected
          ? "Your child's results have not been published for this term."
          : 'Select an academic year and term to view results.'}
      </p>
    </div>
  );
}
