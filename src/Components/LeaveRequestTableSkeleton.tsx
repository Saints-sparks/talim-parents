import SkeletonLoader from './SkeletonLoader';

const HEADERS = ['Request Date', 'Leave Period', 'Type', 'Status', 'Actions'];
const ROW_COUNT = 6;

/**
 * Placeholder for the leave requests table while it loads.
 *
 * @returns The skeleton.
 */
export default function LeaveRequestTableSkeleton() {
  return (
    <div className="max-h-96 overflow-auto" role="status" aria-busy="true">
      <span className="sr-only">Loading leave requests…</span>
      <table className="min-w-full border-collapse border border-gray-200 dark:border-slate-800">
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header}
                className="border border-gray-300 bg-gray-50 p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROW_COUNT }, (_, row) => (
            <tr key={row} className="border-b border-gray-200 dark:border-slate-800">
              {HEADERS.map((header) => (
                <td key={header} className="border border-gray-300 p-3 dark:border-slate-700">
                  <SkeletonLoader type="custom" height="1rem" width="100%" className="rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
