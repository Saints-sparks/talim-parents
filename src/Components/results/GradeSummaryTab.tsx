import { LuTrendingUp, LuTrophy } from 'react-icons/lu';
import { DISTRIBUTION_ORDER } from './gradeStyles';
import type { GradeSummary } from '../../services/results.services';

/**
 * A bulleted list of subject names, or a note when there are none.
 *
 * @param props - Component props.
 * @param props.items - Subject names.
 * @param props.emptyText - Shown when the list is empty.
 * @param props.tone - Colour family.
 * @returns The list.
 */
function SubjectList({ items, emptyText, tone }: { items: string[]; emptyText: string; tone: 'green' | 'orange' }) {
  const text = tone === 'green' ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300';
  const dot = tone === 'green' ? 'bg-green-400' : 'bg-orange-400';
  const muted = tone === 'green' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400';

  if (!items.length) return <p className={`text-sm opacity-60 ${muted}`}>{emptyText}</p>;
  return (
    <ul className="space-y-1">
      {items.map((name, index) => (
        <li key={`${name}-${index}`} className={`flex items-center gap-2 text-sm ${text}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" /> {name}
        </li>
      ))}
    </ul>
  );
}

/**
 * How many subjects landed in each grade, plus the strongest and weakest.
 *
 * @param props - Component props.
 * @param props.gradeSummary - The grade distribution and subject lists.
 * @returns The tab body.
 */
export default function GradeSummaryTab({ gradeSummary }: { gradeSummary: GradeSummary }) {
  const { distribution, strengths, improvementAreas } = gradeSummary;
  const total = Object.values(distribution ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">Grade Distribution</h3>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
          {DISTRIBUTION_ORDER.map(({ key, label, color }) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white ${color}`}
              >
                {distribution?.[key] || 0}
              </div>
              <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
            {DISTRIBUTION_ORDER.map(({ key, color }) => {
              const count = distribution?.[key] || 0;
              return count > 0 ? (
                <div key={key} className={`h-full ${color}`} style={{ width: `${(count / total) * 100}%` }} title={`${key}: ${count}`} />
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
            <LuTrophy size={14} aria-hidden="true" /> Strengths
          </h3>
          <SubjectList items={strengths ?? []} emptyText="No outstanding subjects this term." tone="green" />
        </div>

        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
            <LuTrendingUp size={14} aria-hidden="true" /> Needs Improvement
          </h3>
          <SubjectList items={improvementAreas ?? []} emptyText="No subjects need improvement." tone="orange" />
        </div>
      </div>
    </div>
  );
}
