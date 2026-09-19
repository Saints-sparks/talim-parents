import { useState } from 'react';
import { LuCircleAlert, LuDownload } from 'react-icons/lu';
import ActiveChildGate from '../Components/parent/ActiveChildGate';
import ResultsKpis from '../Components/results/ResultsKpis';
import ResultsTabPanel from '../Components/results/ResultsTabPanel';
import { EmptyResultsState, ResultsLoadingSkeleton } from '../Components/results/ResultsStates';
import { GradeLegendCard, PerformanceSummaryCard } from '../Components/results/ResultsSidebar';
import SubjectResultsTab from '../Components/results/SubjectResultsTab';
import GradeSummaryTab from '../Components/results/GradeSummaryTab';
import TermProgressTab from '../Components/results/TermProgressTab';
import AssessmentBreakdownTab from '../Components/results/AssessmentBreakdownTab';
import { RESULT_TABS } from '../Components/results/gradeStyles';
import { downloadResultsCsv } from '../Components/results/resultsFormat';
import { ErrorState } from '../Components/StateComponents';
import { useResults } from '../hooks/useResults';
import { useTerms } from '../hooks/useTerms';
import { childFullName, childRecordId, type ParentChild } from '../types/parent';

/**
 * One child's published results for a term: headline figures, four views and
 * the grading scale.
 *
 * @param props - Component props.
 * @param props.child - A child verified to be linked to the signed-in parent.
 * @returns The page body.
 */
function ResultsView({ child }: { child: ParentChild }) {
  const childId = childRecordId(child);
  const terms = useTerms();
  // `null` until the parent picks one; then the school's current term, else the first.
  const [pickedTermId, setPickedTermId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const termList = terms.data ?? [];
  const defaultTermId = (termList.find((term) => term.isCurrent) ?? termList[0])?._id ?? '';
  const termId = pickedTermId ?? defaultTermId;

  // Hold the requests until the term list has settled so the page does not
  // fetch "all terms" and then refetch the current one a moment later.
  const { summary, subjects, gradeSummary, termProgress, breakdown } = useResults(
    terms.isPending ? undefined : childId,
    termId,
  );

  const subjectRows = subjects.data ?? [];
  const isLoading = terms.isPending || summary.isPending || subjects.isPending;
  const failed = summary.isError ? summary : subjects.isError ? subjects : null;

  const retryAll = (): void => {
    void summary.refetch();
    void subjects.refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Results</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-400">
            View {childFullName(child) ? `${childFullName(child)}'s` : "your child's"} academic performance and progress.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadResultsCsv(subjectRows, summary.data?.student?.fullName)}
          disabled={!subjectRows.length}
          className="flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#002244] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <LuDownload size={15} aria-hidden="true" />
          Download Term Report
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="results-term">
          Term
        </label>
        <select
          id="results-term"
          value={termId}
          onChange={(event) => setPickedTermId(event.target.value)}
          disabled={terms.isPending}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All Terms</option>
          {termList.map((term) => (
            <option key={term._id} value={term._id}>
              {term.name} {term.isCurrent ? '(Current)' : ''}
            </option>
          ))}
        </select>

        {terms.isError && (
          <button
            type="button"
            onClick={() => void terms.refetch()}
            className="text-xs font-semibold text-[#003366] underline dark:text-blue-300"
          >
            Terms didn&apos;t load — retry
          </button>
        )}

        {summary.data?.student?.className && (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {summary.data.student.className}
          </div>
        )}
      </div>

      {isLoading ? (
        <ResultsLoadingSkeleton />
      ) : failed ? (
        <ErrorState error={failed.error} onRetry={retryAll} title="Couldn't load results" />
      ) : (
        <>
          <ResultsKpis summary={summary.data} />

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div role="tablist" aria-label="Result views" className="flex overflow-x-auto border-b border-gray-100 dark:border-slate-800">
                {RESULT_TABS.map((tab, index) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === index}
                    onClick={() => setActiveTab(index)}
                    className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
                      activeTab === index
                        ? 'border-[#003366] text-[#003366] dark:border-blue-400 dark:text-blue-300'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-4" role="tabpanel">
                {subjectRows.length === 0 ? (
                  <EmptyResultsState termSelected={Boolean(termId)} />
                ) : (
                  <>
                    {activeTab === 0 && <SubjectResultsTab subjects={subjectRows} summary={summary.data} />}
                    {activeTab === 1 && (
                      <ResultsTabPanel query={gradeSummary} title="the grade summary">
                        {(data) => <GradeSummaryTab gradeSummary={data} />}
                      </ResultsTabPanel>
                    )}
                    {activeTab === 2 && (
                      <ResultsTabPanel query={termProgress} title="term progress">
                        {(data) => <TermProgressTab termProgress={data} />}
                      </ResultsTabPanel>
                    )}
                    {activeTab === 3 && (
                      <ResultsTabPanel query={breakdown} title="the assessment breakdown">
                        {(data) => <AssessmentBreakdownTab breakdown={data} />}
                      </ResultsTabPanel>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-gray-50 bg-gray-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                  <LuCircleAlert size={12} aria-hidden="true" />
                  Scores are calculated based on test and exam assessment weights. Only results your child&apos;s
                  teachers have published are shown.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:w-64">
              <GradeLegendCard />
              <PerformanceSummaryCard summary={summary.data} subjects={subjectRows} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Results for the child the parent is looking at.
 *
 * @returns The page.
 */
export default function Result() {
  return <ActiveChildGate subject="results">{(child) => <ResultsView child={child} />}</ActiveChildGate>;
}
