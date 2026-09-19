import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../test-utils/render';
import Result from '../Result';
import { ApiError } from '../../lib/apiError';
import type { ParentChild } from '../../types/parent';

const AMARA: ParentChild = { childId: '65d0000000000000000000c1', firstName: 'Amara', lastName: 'Okafor' };
const STALE: ParentChild = { childId: '65d0000000000000000000ff', firstName: 'Gone', lastName: 'Child' };

const updateSelectedStudent = vi.fn();
let selected: ParentChild | null = AMARA;
let wards: ParentChild[] = [AMARA];

vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: selected, updateSelectedStudent }),
}));
vi.mock('../../contexts/ParentOnboardingContext', () => ({
  useParentOnboarding: () => ({ wards, wardsLoading: false, wardsError: null, refreshWards: vi.fn() }),
}));

const getResultSummary = vi.fn();
const getSubjectResults = vi.fn();
const getGradeSummary = vi.fn();
const getTermProgress = vi.fn();
const getAssessmentBreakdown = vi.fn();
vi.mock('../../services/results.services', () => ({
  getResultSummary: (...a: unknown[]) => getResultSummary(...a),
  getSubjectResults: (...a: unknown[]) => getSubjectResults(...a),
  getGradeSummary: (...a: unknown[]) => getGradeSummary(...a),
  getTermProgress: (...a: unknown[]) => getTermProgress(...a),
  getAssessmentBreakdown: (...a: unknown[]) => getAssessmentBreakdown(...a),
}));

const getSchoolTerms = vi.fn();
vi.mock('../../services/term.services', () => ({
  getSchoolTerms: () => getSchoolTerms(),
  getCurrentTerm: vi.fn(),
}));

const TERMS = [
  { _id: 't1', name: 'First Term', isCurrent: false },
  { _id: 't2', name: 'Second Term', isCurrent: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  selected = AMARA;
  wards = [AMARA];
  getSchoolTerms.mockResolvedValue(TERMS);
  getResultSummary.mockResolvedValue({
    student: { id: 's1', fullName: 'Amara Okafor', className: 'JSS 1' },
    term: 'Second Term',
    overallAverage: 72.5,
    overallGrade: 'B',
    gradeRemark: 'Above Average',
    classPosition: 3,
    totalStudents: 30,
    totalSubjects: 1,
    highestSubject: { name: 'Mathematics', percentage: 80 },
    assessmentsCompleted: 4,
    totalAssessments: 4,
    classAverage: 61.2,
    remarks: null,
    isPublished: true,
  });
  getSubjectResults.mockResolvedValue([
    {
      courseId: 'c1',
      subjectName: 'Mathematics',
      testScoreRaw: 24,
      testScoreWeighted: 24,
      examScoreRaw: 56,
      examScoreWeighted: 39.2,
      totalScore: 63.2,
      grade: 'C',
      remark: 'Below Average',
      assessmentsCount: 2,
      cumulativeScore: 63.2,
      maxScore: 100,
    },
  ]);
  getGradeSummary.mockResolvedValue({ distribution: { C: 1 }, strengths: [], improvementAreas: ['Mathematics'] });
  getTermProgress.mockResolvedValue({ trend: [], courseProgress: [] });
  getAssessmentBreakdown.mockResolvedValue([]);
});

describe('Result page', () => {
  it("asks only for the linked child's results, for the school's current term", async () => {
    renderWithProviders(<Result />);
    expect(await screen.findByRole('cell', { name: /mathematics/i })).toBeInTheDocument();

    expect(getResultSummary).toHaveBeenCalledWith(AMARA.childId, { termId: 't2' });
    expect(getSubjectResults).toHaveBeenCalledWith(AMARA.childId, { termId: 't2' });
    expect(screen.getByRole('combobox', { name: /term/i })).toHaveValue('t2');
  });

  it('never sends a remembered child the server no longer links to this parent', async () => {
    selected = STALE;
    renderWithProviders(<Result />);
    await screen.findByRole('cell', { name: /mathematics/i });

    expect(getResultSummary).not.toHaveBeenCalledWith(STALE.childId, expect.anything());
    expect(getResultSummary).toHaveBeenCalledWith(AMARA.childId, expect.anything());
    // …and the stale selection is replaced so the header agrees.
    await waitFor(() => expect(updateSelectedStudent).toHaveBeenCalledWith(AMARA));
  });

  it('refetches for the chosen term', async () => {
    renderWithProviders(<Result />);
    await screen.findByRole('cell', { name: /mathematics/i });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /term/i }), 't1');

    await waitFor(() => expect(getResultSummary).toHaveBeenCalledWith(AMARA.childId, { termId: 't1' }));
  });

  it('shows a retryable error, not a spinner, when the results fail', async () => {
    getResultSummary.mockRejectedValue(new ApiError('FORBIDDEN', 'Student is not linked to this parent', 403));
    renderWithProviders(<Result />);

    expect(await screen.findByText(/couldn't load results/i)).toBeInTheDocument();
    expect(screen.getByText(/isn't available for your account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('keeps the other tabs readable when one view fails', async () => {
    getGradeSummary.mockRejectedValue(new ApiError('NETWORK_OFFLINE', 'offline', 0));
    renderWithProviders(<Result />);
    await screen.findByRole('cell', { name: /mathematics/i });

    await userEvent.click(screen.getByRole('tab', { name: /grade summary/i }));
    expect(await screen.findByText(/couldn't load the grade summary/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /subject results/i }));
    expect(await screen.findByRole('cell', { name: /mathematics/i })).toBeInTheDocument();
  });

  it('says so, without placeholder data, when nothing is published', async () => {
    getSubjectResults.mockResolvedValue([]);
    renderWithProviders(<Result />);

    expect(await screen.findByText(/no results available yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download term report/i })).toBeDisabled();
  });

  it('still loads results when the term list fails, for the default term', async () => {
    getSchoolTerms.mockRejectedValue(new ApiError('SERVICE_UNAVAILABLE', 'down', 503));
    renderWithProviders(<Result />);

    await screen.findByRole('cell', { name: /mathematics/i });
    expect(getResultSummary).toHaveBeenCalledWith(AMARA.childId, {});
    expect(screen.getByRole('button', { name: /terms didn't load/i })).toBeInTheDocument();
  });
});
