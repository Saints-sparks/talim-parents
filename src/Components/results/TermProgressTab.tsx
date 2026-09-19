import { LuBookText } from 'react-icons/lu';
import GradeBadge from './GradeBadge';
import { EmptyResultsState } from './ResultsStates';
import { formatFigure } from './resultsFormat';
import type { TermProgress } from '../../services/results.services';

/**
 * Each course's score against the class average.
 *
 * @param props - Component props.
 * @param props.termProgress - The course progress rows.
 * @returns The tab body.
 */
export default function TermProgressTab({ termProgress }: { termProgress: TermProgress }) {
  const { courseProgress } = termProgress;
  if (!courseProgress?.length) return <EmptyResultsState termSelected />;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Course Performance vs Class Average</h3>
      <div className="space-y-3">
        {courseProgress.map((course, index) => (
          <div key={`${course.courseId}-${index}`} className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <LuBookText className="shrink-0 text-gray-400 dark:text-slate-500" aria-hidden="true" />
                <span className="truncate text-sm font-medium text-gray-800 dark:text-slate-100">
                  {course.subjectName}
                </span>
                <GradeBadge grade={course.grade} />
              </div>
              <span className="shrink-0 text-sm font-bold text-gray-700 dark:text-slate-200">
                {formatFigure(course.percentage, 1, '%')}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[#003366] transition-all dark:bg-blue-500"
                style={{ width: `${Math.min(course.percentage, 100)}%` }}
              />
              {course.classAverage !== null && (
                <div
                  className="absolute top-[-2px] h-[calc(100%+4px)] w-0.5 bg-orange-400"
                  style={{ left: `${Math.min(course.classAverage, 100)}%` }}
                  title={`Class avg: ${formatFigure(course.classAverage, 1, '%')}`}
                />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">{course.remark}</span>
              {course.classAverage !== null && (
                <span className="text-xs text-orange-500 dark:text-orange-400">
                  Class avg: {formatFigure(course.classAverage, 1, '%')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-1 text-xs text-gray-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-3 rounded bg-[#003366] dark:bg-blue-500" /> Student score
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-0.5 bg-orange-400" /> Class average
        </div>
      </div>
    </div>
  );
}
