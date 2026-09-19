import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getAssessmentBreakdown,
  getGradeSummary,
  getResultSummary,
  getSubjectResults,
  getTermProgress,
  type AssessmentBreakdownRow,
  type GradeSummary,
  type ResultSummary,
  type ResultsQuery,
  type SubjectResult,
  type TermProgress,
} from '../services/results.services';
import { queryKeys, staleTimes } from '../lib/queryKeys';

/** The five result views for one child and term, each its own cached query. */
export interface ResultsQueries {
  summary: UseQueryResult<ResultSummary>;
  subjects: UseQueryResult<SubjectResult[]>;
  gradeSummary: UseQueryResult<GradeSummary>;
  termProgress: UseQueryResult<TermProgress>;
  breakdown: UseQueryResult<AssessmentBreakdownRow[]>;
}

/**
 * One child's published results for a term.
 *
 * The five calls go out in parallel and are cached separately, so switching
 * tabs never refetches and one failing view (say the class averages) leaves
 * the others readable. Nothing is requested until a child linked to the
 * signed-in parent is chosen — the server refuses any other with `FORBIDDEN`.
 *
 * @param childId - Student record id of a child linked to this parent.
 * @param termId - The term to show; empty for the server's default.
 * @returns The five queries.
 */
export function useResults(childId: string | undefined, termId: string): ResultsQueries {
  const params: ResultsQuery = termId ? { termId } : {};
  const enabled = Boolean(childId);
  const id = childId ?? 'none';

  const summary = useQuery({
    queryKey: queryKeys.results.summary(id, params),
    queryFn: () => getResultSummary(id, params),
    enabled,
    staleTime: staleTimes.list,
  });
  const subjects = useQuery({
    queryKey: queryKeys.results.subjects(id, params),
    queryFn: () => getSubjectResults(id, params),
    enabled,
    staleTime: staleTimes.list,
  });
  const gradeSummary = useQuery({
    queryKey: queryKeys.results.gradeSummary(id, params),
    queryFn: () => getGradeSummary(id, params),
    enabled,
    staleTime: staleTimes.list,
  });
  const termProgress = useQuery({
    queryKey: queryKeys.results.termProgress(id, params),
    queryFn: () => getTermProgress(id, params),
    enabled,
    staleTime: staleTimes.list,
  });
  const breakdown = useQuery({
    queryKey: queryKeys.results.assessmentBreakdown(id, params),
    queryFn: () => getAssessmentBreakdown(id, params),
    enabled,
    staleTime: staleTimes.list,
  });

  return { summary, subjects, gradeSummary, termProgress, breakdown };
}
