import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render';
import MyChildren from '../MyChildren';
import { ApiError } from '../../lib/apiError';
import type { ParentChild } from '../../types/parent';

const AMARA: ParentChild = {
  childId: '65d0000000000000000000c1',
  firstName: 'Amara',
  lastName: 'Okafor',
  className: 'JSS 1',
  schoolName: 'Bright Star',
  isDefault: true,
  attendancePercentage: 90,
  currentGradeSummary: 'B',
  subjectsCount: 9,
  teachersCount: 7,
};
const BOLA: ParentChild = { childId: '65d0000000000000000000c2', firstName: 'Bola', lastName: 'Okafor', className: 'JSS 3' };

const updateSelectedStudent = vi.fn();
const refreshWards = vi.fn();
let wards: ParentChild[] = [AMARA, BOLA];
let wardsError: string | null = null;

vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: AMARA, updateSelectedStudent }),
}));
vi.mock('../../contexts/ParentOnboardingContext', () => ({
  useParentOnboarding: () => ({ wards, wardsLoading: false, wardsError, refreshWards }),
}));

const getParentChildrenOverview = vi.fn();
const getParentChildrenUpdates = vi.fn();
const setDefaultChild = vi.fn();
vi.mock('../../services/parent.services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/parent.services')>();
  return {
    ...actual,
    getParentChildrenOverview: (...a: unknown[]) => getParentChildrenOverview(...a),
    getParentChildrenUpdates: (...a: unknown[]) => getParentChildrenUpdates(...a),
    setDefaultChild: (...a: unknown[]) => setDefaultChild(...a),
  };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('../../Components/CustomToast', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  wards = [AMARA, BOLA];
  wardsError = null;
  refreshWards.mockResolvedValue([]);
  getParentChildrenOverview.mockResolvedValue({
    totalChildren: 2,
    averageAttendance: 88,
    averageGrade: 71,
    totalSubjects: 18,
    recentUpdates: [],
  });
  getParentChildrenUpdates.mockResolvedValue([]);
  setDefaultChild.mockResolvedValue({ childId: BOLA.childId, message: 'Default child updated' });
});

describe('My Children', () => {
  it('lists every linked child with real figures', async () => {
    renderWithProviders(<MyChildren />);
    expect(await screen.findByText('Amara Okafor')).toBeInTheDocument();
    expect(screen.getByText('Bola Okafor')).toBeInTheDocument();
    expect(await screen.findByText('88%')).toBeInTheDocument();
  });

  it('marks only the server-side default child as primary', async () => {
    renderWithProviders(<MyChildren />);
    await screen.findByText('Amara Okafor');
    expect(screen.getAllByText('Primary Child')).toHaveLength(1);
  });

  it('offers no control that does nothing', async () => {
    renderWithProviders(<MyChildren />);
    await screen.findByText('Amara Okafor');
    expect(screen.queryByTitle(/more actions/i)).not.toBeInTheDocument();
  });

  it("sets the chosen child as primary by its record id, then refreshes the list", async () => {
    renderWithProviders(<MyChildren />);
    await screen.findByText('Bola Okafor');

    fireEvent.click(screen.getByRole('button', { name: /make bola okafor the primary child/i }));

    await waitFor(() => expect(setDefaultChild).toHaveBeenCalledWith(BOLA.childId));
    await waitFor(() => expect(refreshWards).toHaveBeenCalled());
    expect(updateSelectedStudent).toHaveBeenCalledWith(BOLA);
    expect(toastSuccess).toHaveBeenCalledWith('Bola Okafor is now your primary child.');
  });

  it('reports a failure to set the primary child', async () => {
    setDefaultChild.mockRejectedValue(new ApiError('FORBIDDEN', 'Student is not linked to this parent', 403));
    renderWithProviders(<MyChildren />);
    await screen.findByText('Bola Okafor');

    fireEvent.click(screen.getByRole('button', { name: /make bola okafor the primary child/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Student is not linked to this parent'));
  });

  it('falls back to figures from the children list when the overview fails', async () => {
    getParentChildrenOverview.mockRejectedValue(new ApiError('SERVICE_UNAVAILABLE', 'down', 503));
    renderWithProviders(<MyChildren />);
    await screen.findByText('Amara Okafor');
    await waitFor(() => expect(screen.getAllByText('90%').length).toBeGreaterThan(0));
  });

  it('shows a retryable error when the children could not be loaded', async () => {
    wards = [];
    wardsError = 'Could not load your children.';
    renderWithProviders(<MyChildren />);
    expect(await screen.findByText(/failed to fetch children/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refreshWards).toHaveBeenCalled();
  });

  it('has no fake "contact admin" button when no child is linked', async () => {
    wards = [];
    renderWithProviders(<MyChildren />);
    expect(await screen.findByText(/no children linked yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contact school admin/i })).not.toBeInTheDocument();
  });
});
