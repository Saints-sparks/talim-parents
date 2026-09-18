import { api, buildQuery } from '../lib/apiClient';

/**
 * Parent results endpoints (`/parent/results/:studentId/*`).
 *
 * The controller is `@Roles(UserRole.PARENT)` and every method first runs
 * `validateParentStudentAccess`, which resolves the caller's parent record and
 * requires `student.parentId` to be them — so a student id that is not this
 * parent's child is refused with `FORBIDDEN`.
 */

/** Term / academic-year narrowing accepted by every results route. */
export interface ResultsQuery {
  termId?: string;
  /** The API's name for the year. There is no `session` parameter. */
  academicYearId?: string;
}

/** Extra narrowing the assessment breakdown accepts. */
export interface AssessmentBreakdownQuery extends ResultsQuery {
  courseId?: string;
}

/** What `GET /parent/results/:studentId/summary` returns. */
export interface ResultSummary {
  student: { id: string; fullName: string; avatar?: string; className?: string; gradeLevel?: string };
  term?: { _id?: string; name?: string; [key: string]: unknown };
  overallAverage: number;
  overallGrade: string;
  gradeRemark: string;
  /** `null` until the class cumulative is published. */
  classPosition: number | null;
  totalStudents: number;
  totalSubjects: number;
  highestSubject: { name: string; percentage: number } | null;
  assessmentsCompleted: number;
  totalAssessments: number;
  classAverage: number;
  remarks?: string;
  isPublished: boolean;
}

/** One subject's result line. Score fields are null until assessments exist. */
export interface SubjectResult {
  courseId: string;
  subjectName: string;
  testScoreRaw: number | null;
  testScoreWeighted: number | null;
  examScoreRaw: number | null;
  examScoreWeighted: number | null;
  totalScore: number | null;
  grade: string;
  remark: string;
  assessmentsCount: number;
  cumulativeScore: number | null;
  maxScore: number | null;
}

/** What `GET /parent/results/:studentId/grade-summary` returns. */
export interface GradeSummary {
  distribution: Record<string, number>;
  strengths: string[];
  improvementAreas: string[];
}

/** What `GET /parent/results/:studentId/term-progress` returns. */
export interface TermProgress {
  trend: Array<{ label: string; date: string; percentage: number; classAverage: number }>;
  courseProgress: Array<{
    courseId: string;
    subjectName: string;
    percentage: number;
    classAverage: number;
    grade: string;
    remark: string;
  }>;
}

/** One assessment in the breakdown. */
export interface AssessmentBreakdownRow {
  assessmentId: string;
  assessmentName: string;
  subjectName: string;
  actualScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  remark: string;
  recordedBy?: string;
  dateRecorded?: string;
}

/**
 * Builds a results path for one child.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param segment - The route segment after the student id.
 * @param query - Term / year narrowing.
 * @returns The path to request.
 */
const path = (studentId: string, segment: string, query: ResultsQuery | AssessmentBreakdownQuery): string =>
  `/parent/results/${encodeURIComponent(studentId)}/${segment}${buildQuery({ ...query })}`;

/**
 * One child's headline result for a term.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param query - Term / year narrowing; defaults to the current term.
 * @returns The summary.
 * @throws {ApiError} `FORBIDDEN` when the child is not this parent's.
 */
export function getResultSummary(studentId: string, query: ResultsQuery = {}): Promise<ResultSummary> {
  return api.get<ResultSummary>(path(studentId, 'summary', query));
}

/**
 * One child's per-subject results.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param query - Term / year narrowing.
 * @returns One row per subject.
 * @throws {ApiError} `FORBIDDEN` when the child is not this parent's.
 */
export function getSubjectResults(studentId: string, query: ResultsQuery = {}): Promise<SubjectResult[]> {
  return api.get<SubjectResult[]>(path(studentId, 'subjects', query));
}

/**
 * The grade distribution, strengths and areas to improve.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param query - Term / year narrowing.
 * @returns The grade summary.
 * @throws {ApiError} `FORBIDDEN` when the child is not this parent's.
 */
export function getGradeSummary(studentId: string, query: ResultsQuery = {}): Promise<GradeSummary> {
  return api.get<GradeSummary>(path(studentId, 'grade-summary', query));
}

/**
 * How the child's average moved through the term, against the class.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param query - Term / year narrowing.
 * @returns The trend and per-course progress.
 * @throws {ApiError} `FORBIDDEN` when the child is not this parent's.
 */
export function getTermProgress(studentId: string, query: ResultsQuery = {}): Promise<TermProgress> {
  return api.get<TermProgress>(path(studentId, 'term-progress', query));
}

/**
 * Every published assessment behind the child's results.
 *
 * @param studentId - Student record id of a child linked to this parent.
 * @param query - Term / year narrowing, and an optional course filter.
 * @returns One row per assessment.
 * @throws {ApiError} `FORBIDDEN` when the child is not this parent's.
 */
export function getAssessmentBreakdown(
  studentId: string,
  query: AssessmentBreakdownQuery = {},
): Promise<AssessmentBreakdownRow[]> {
  return api.get<AssessmentBreakdownRow[]>(path(studentId, 'assessment-breakdown', query));
}
