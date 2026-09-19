import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render';
import RequestLeave from '../RequestLeave';
import LeaveRequestTable from '../../Components/LeaveRequestTable';
import { ApiError } from '../../lib/apiError';
import type { ParentChild } from '../../types/parent';
import type { LeaveRequest } from '../../services/leaveRequest.services';

const AMARA: ParentChild = { childId: '65d0000000000000000000c1', firstName: 'Amara', lastName: 'Okafor' };

const updateSelectedStudent = vi.fn();
let selected: ParentChild | null = AMARA;

vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: selected, updateSelectedStudent }),
}));
vi.mock('../../contexts/ParentOnboardingContext', () => ({
  useParentOnboarding: () => ({ wards: [AMARA], wardsLoading: false, wardsError: null, refreshWards: vi.fn() }),
}));

const getLeaveRequestsByChild = vi.fn();
vi.mock('../../services/leaveRequest.services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/leaveRequest.services')>();
  return { ...actual, getLeaveRequestsByChild: (...a: unknown[]) => getLeaveRequestsByChild(...a) };
});

/** A leave request, overridable per test. */
function leave(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    _id: 'l1',
    child: AMARA.childId as string,
    startDate: '2026-09-10T00:00:00.000Z',
    endDate: '2026-09-12T00:00:00.000Z',
    leaveType: 'Sick' as LeaveRequest['leaveType'],
    status: 'Pending' as LeaveRequest['status'],
    createdAt: '2026-09-08T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  selected = AMARA;
  getLeaveRequestsByChild.mockResolvedValue([leave()]);
});

describe('RequestLeave page', () => {
  it("lists the linked child's requests", async () => {
    renderWithProviders(<RequestLeave />);
    expect((await screen.findAllByText('Pending')).length).toBeGreaterThan(0);
    expect(getLeaveRequestsByChild).toHaveBeenCalledWith(AMARA.childId);
  });

  it('never asks about a remembered child the server no longer links', async () => {
    selected = { childId: '65d0000000000000000000ff', firstName: 'Gone' };
    renderWithProviders(<RequestLeave />);
    await screen.findAllByText('Pending');

    expect(getLeaveRequestsByChild).not.toHaveBeenCalledWith('65d0000000000000000000ff');
    await waitFor(() => expect(updateSelectedStudent).toHaveBeenCalledWith(AMARA));
  });

  it('shows a retryable error rather than an empty list when the request fails', async () => {
    getLeaveRequestsByChild.mockRejectedValue(new ApiError('FORBIDDEN', 'You can only view your own children', 403));
    renderWithProviders(<RequestLeave />);
    expect(await screen.findByText(/couldn't load leave requests/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows the empty state, with a working button, when there are none', async () => {
    getLeaveRequestsByChild.mockResolvedValue([]);
    renderWithProviders(<RequestLeave />);
    expect(await screen.findByText(/no leave requests yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new leave request/i })).toBeEnabled();
  });
});

describe('LeaveRequestTable', () => {
  it('pages the requests and falls back to a valid page when the list shrinks', () => {
    const many = Array.from({ length: 9 }, (_, index) => leave({ _id: `l${index}` }));
    const { rerender } = renderWithProviders(<LeaveRequestTable leaveRequests={many} onNewRequest={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Page'), { target: { value: '3' } });
    expect(screen.getByText(/showing 9 - 9 of 9/i)).toBeInTheDocument();

    rerender(<LeaveRequestTable leaveRequests={many.slice(0, 3)} onNewRequest={vi.fn()} />);
    expect(screen.getByText(/showing 1 - 3 of 3/i)).toBeInTheDocument();
  });

  it('labels a rejected request as rejected, not as an unknown status', () => {
    renderWithProviders(
      <LeaveRequestTable leaveRequests={[leave({ status: 'Rejected' as LeaveRequest['status'] })]} onNewRequest={vi.fn()} />,
    );
    expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0);
  });
});
