import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/render';
import Timetable from '../Timetable';
import { ApiError } from '../../lib/apiError';
import type { ParentChild } from '../../types/parent';

const AMARA: ParentChild = { childId: '65d0000000000000000000c1', firstName: 'Amara', lastName: 'Okafor', className: 'JSS 1', schoolName: 'Bright Star' };
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

const getChildTimetable = vi.fn();
const downloadChildTimetable = vi.fn();
vi.mock('../../services/parent.services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/parent.services')>();
  return {
    ...actual,
    getChildTimetable: (...a: unknown[]) => getChildTimetable(...a),
    downloadChildTimetable: (...a: unknown[]) => downloadChildTimetable(...a),
  };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('../../Components/CustomToast', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

const SLOTS = [
  { day: 'Monday', startTime: '08:00', endTime: '08:45', subjectName: 'Mathematics', teacherName: 'Unassigned teacher', room: 'JSS 1', type: 'class' },
  { day: 'all', startTime: '12:00', endTime: '12:45', title: 'Break Time', type: 'break' },
];

/** A timetable payload, overridable per test. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    child: AMARA,
    weekRange: { start: '2026-09-14', end: '2026-09-19' },
    weekDays: ['Monday'],
    timetableSlots: SLOTS,
    todaySchedule: SLOTS,
    listView: [{ day: 'Monday', date: '2026-09-14', classes: [SLOTS[0]] }],
    classInformation: { classTeacher: 'Mrs Bello', roomNumber: 'R1', schoolName: 'Bright Star' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  selected = AMARA;
  wards = [AMARA, BOLA];
  getChildTimetable.mockResolvedValue(payload());
  downloadChildTimetable.mockResolvedValue(new Blob(['a,b']));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Timetable page', () => {
  it("asks for the linked child's week by its local Monday", async () => {
    renderWithProviders(<Timetable />);
    await screen.findAllByText('Mathematics');

    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1);
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    expect(getChildTimetable).toHaveBeenCalledWith(AMARA.childId, { weekStart: key });
  });

  it("shows the class teacher on slots the API left 'Unassigned teacher'", async () => {
    renderWithProviders(<Timetable />);
    await screen.findAllByText('Mathematics');
    expect(screen.getAllByText('Mrs Bello').length).toBeGreaterThan(0);
    expect(screen.queryByText('Unassigned teacher')).not.toBeInTheDocument();
  });

  it('switches to the list without another request', async () => {
    renderWithProviders(<Timetable />);
    await screen.findAllByText('Mathematics');

    fireEvent.click(screen.getByRole('button', { name: /list view/i }));

    expect(await screen.findByText('2026-09-14')).toBeInTheDocument();
    expect(getChildTimetable).toHaveBeenCalledTimes(1);
  });

  it('asks for the next week when the arrow is pressed', async () => {
    renderWithProviders(<Timetable />);
    await screen.findAllByText('Mathematics');

    fireEvent.click(screen.getByRole('button', { name: /next week/i }));

    await waitFor(() => expect(getChildTimetable).toHaveBeenCalledTimes(2));
    const [first, second] = getChildTimetable.mock.calls.map((call) => (call[1] as { weekStart: string }).weekStart);
    expect(new Date(`${second}T00:00:00`).getTime() - new Date(`${first}T00:00:00`).getTime()).toBeGreaterThanOrEqual(6.9 * 86_400_000);
  });

  it('never asks for a child the server does not link to this parent', async () => {
    selected = { childId: '65d0000000000000000000ff', firstName: 'Gone' };
    renderWithProviders(<Timetable />);
    await screen.findAllByText('Mathematics');

    expect(getChildTimetable).not.toHaveBeenCalledWith('65d0000000000000000000ff', expect.anything());
    await waitFor(() => expect(updateSelectedStudent).toHaveBeenCalledWith(AMARA));
  });

  it('says so when no timetable is published', async () => {
    getChildTimetable.mockResolvedValue(payload({ timetableSlots: [], todaySchedule: [], listView: [] }));
    renderWithProviders(<Timetable />);
    expect(await screen.findByText(/no timetable available/i)).toBeInTheDocument();
  });

  it('shows a retryable error, not a skeleton, when the request fails', async () => {
    getChildTimetable.mockRejectedValue(new ApiError('FORBIDDEN', 'Child is not linked to this parent', 403));
    renderWithProviders(<Timetable />);
    expect(await screen.findByText(/couldn't load the timetable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('downloads the CSV and confirms with a toast', async () => {
    renderWithProviders(<Timetable />);
    await screen.findAllByText('Mathematics');

    fireEvent.click(screen.getByRole('button', { name: /download timetable/i }));

    await waitFor(() => expect(downloadChildTimetable).toHaveBeenCalledWith(AMARA.childId));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it('reports a failed download instead of failing silently', async () => {
    downloadChildTimetable.mockRejectedValue(new ApiError('SERVICE_UNAVAILABLE', 'Timetable export is unavailable', 503));
    renderWithProviders(<Timetable />);
    await screen.findAllByText('Mathematics');

    fireEvent.click(screen.getByRole('button', { name: /download timetable/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Timetable export is unavailable'));
  });
});
