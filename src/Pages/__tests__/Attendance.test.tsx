import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../test-utils/render';
import Attendance from '../Attendance';
import { ApiError } from '../../lib/apiError';
import type { ParentChild } from '../../types/parent';
import type { MonthlyAttendance } from '../../services/attendance.services';

const AMARA: ParentChild = { childId: '65d0000000000000000000c1', firstName: 'Amara', lastName: 'Okafor' };
const BOLA: ParentChild = { childId: '65d0000000000000000000c2', firstName: 'Bola', lastName: 'Okafor' };

const updateSelectedStudent = vi.fn();
let selected: ParentChild | null = AMARA;
let wards: ParentChild[] = [AMARA, BOLA];

vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: selected, updateSelectedStudent }),
}));
vi.mock('../../contexts/ParentOnboardingContext', () => ({
  useParentOnboarding: () => ({ wards, wardsLoading: false, wardsError: null, refreshWards: vi.fn() }),
}));

const getParentMonthlyAttendance = vi.fn();
vi.mock('../../services/attendance.services', () => ({
  getParentMonthlyAttendance: (...a: unknown[]) => getParentMonthlyAttendance(...a),
  getAttendanceByStudentId: vi.fn(),
}));

/** The current month's key, so records land inside the grid whatever day the suite runs. */
const now = new Date();
const MONTH = now.getMonth() + 1;
const YEAR = now.getFullYear();
const KEY = (d: number) => `${YEAR}-${String(MONTH).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** A monthly payload with a present day on the 2nd and an absent day (with a reason) on the 3rd. */
function monthly(overrides: Partial<MonthlyAttendance> = {}): MonthlyAttendance {
  return {
    student: { id: AMARA.childId as string, firstName: 'Amara', lastName: 'Okafor' },
    period: { month: MONTH, year: YEAR, label: 'This month', startDate: '', endDate: '' },
    summary: {
      present: { count: 1, percentage: 50 },
      absent: { count: 1, percentage: 50 },
      late: { count: 0, percentage: 0 },
      noClass: { count: 0, percentage: 0 },
      attendanceRate: 50,
      totalRecorded: 2,
      totalSchoolDays: 2,
    },
    calendarDays: [
      { id: 'a', date: KEY(2), day: 'Monday', status: 'present', statusLabel: 'Present', time: '8:00 AM', notes: 'All classes attended' },
      { id: 'b', date: KEY(3), day: 'Tuesday', status: 'absent', statusLabel: 'Absent', time: null, notes: 'Malaria' },
    ],
    selectedDay: { date: KEY(2), day: 'Monday', status: 'present', statusLabel: 'Present', time: null, notes: '' },
    recentRecords: [
      { id: 'a', date: KEY(2), day: 'Monday', status: 'present', statusLabel: 'Present', time: '8:00 AM', notes: 'All classes attended' },
    ],
    generatedAt: '',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  selected = AMARA;
  wards = [AMARA, BOLA];
  getParentMonthlyAttendance.mockResolvedValue(monthly());
});

describe('Attendance page', () => {
  it("loads the linked child's month, once, without asking for a selected day", async () => {
    renderWithProviders(<Attendance />);
    expect(await screen.findByRole('heading', { name: 'Attendance' })).toBeInTheDocument();

    expect(getParentMonthlyAttendance).toHaveBeenCalledTimes(1);
    expect(getParentMonthlyAttendance).toHaveBeenCalledWith({ studentId: AMARA.childId, month: MONTH, year: YEAR });
  });

  it('opens a day from the data it already has, with no extra request or skeleton', async () => {
    renderWithProviders(<Attendance />);
    await screen.findByRole('heading', { name: 'Attendance' });

    fireEvent.click(screen.getByLabelText(`${KEY(3)}: Absent`));

    expect(screen.getByText('Malaria')).toBeInTheDocument();
    expect(getParentMonthlyAttendance).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Attendance' })).toBeInTheDocument();
  });

  it('says so for a day the school has not recorded', async () => {
    renderWithProviders(<Attendance />);
    await screen.findByRole('heading', { name: 'Attendance' });

    fireEvent.click(screen.getByLabelText(KEY(5)));

    expect(screen.getByText(/no attendance record has been posted for this day/i)).toBeInTheDocument();
  });

  it('never asks about a child the server no longer links to this parent', async () => {
    selected = { childId: '65d0000000000000000000ff', firstName: 'Gone' };
    renderWithProviders(<Attendance />);
    await screen.findByRole('heading', { name: 'Attendance' });

    expect(getParentMonthlyAttendance).not.toHaveBeenCalledWith(expect.objectContaining({ studentId: '65d0000000000000000000ff' }));
    expect(getParentMonthlyAttendance).toHaveBeenCalledWith(expect.objectContaining({ studentId: AMARA.childId }));
    await waitFor(() => expect(updateSelectedStudent).toHaveBeenCalledWith(AMARA));
  });

  it('switches child from the page when the parent has more than one', async () => {
    renderWithProviders(<Attendance />);
    await screen.findByRole('heading', { name: 'Attendance' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /switch child/i }), BOLA.childId as string);

    expect(updateSelectedStudent).toHaveBeenCalledWith(BOLA);
  });

  it('offers no switcher for a single child', async () => {
    wards = [AMARA];
    renderWithProviders(<Attendance />);
    await screen.findByRole('heading', { name: 'Attendance' });

    expect(screen.queryByRole('combobox', { name: /switch child/i })).not.toBeInTheDocument();
  });

  it('shows a retryable error, not a spinner, when the month fails', async () => {
    getParentMonthlyAttendance.mockRejectedValue(new ApiError('NOT_FOUND', 'Student not found', 404));
    renderWithProviders(<Attendance />);

    expect(await screen.findByText(/couldn't load attendance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('does not fire a request for every keystroke in the year box', async () => {
    renderWithProviders(<Attendance />);
    await screen.findByRole('heading', { name: 'Attendance' });
    getParentMonthlyAttendance.mockClear();

    const year = screen.getByRole('textbox', { name: /year/i });
    await userEvent.clear(year);
    await userEvent.type(year, '2025');

    await waitFor(() => expect(getParentMonthlyAttendance).toHaveBeenCalledTimes(1));
    expect(getParentMonthlyAttendance).toHaveBeenCalledWith(expect.objectContaining({ year: 2025 }));
  });
});
