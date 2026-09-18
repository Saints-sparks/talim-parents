import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../test-utils/render';
import LeaveForm from '../LeaveForm';
import type { ParentChild } from '../../types/parent';

const FIRST: ParentChild = { childId: '65c0000000000000000000a1', firstName: 'Amara', lastName: 'Okafor', className: 'JSS 1' };
const SECOND: ParentChild = { childId: '65c0000000000000000000a2', firstName: 'Chidi', lastName: 'Okafor', className: 'JSS 3' };

const TERM = { _id: '65c000000000000000000ttt', name: 'Third Term' };

let selected: ParentChild | null = SECOND;
let wards: ParentChild[] = [FIRST, SECOND];

vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: selected, updateSelectedStudent: vi.fn() }),
}));

vi.mock('../../contexts/ParentOnboardingContext', () => ({
  useParentOnboarding: () => ({ wards, wardsLoading: false }),
}));

const createLeaveRequest = vi.fn();
const getCurrentTerm = vi.fn();
const uploadFile = vi.fn();
const navigate = vi.fn();

vi.mock('../../services/leaveRequest.services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/leaveRequest.services')>();
  return { ...actual, createLeaveRequest: (...a: unknown[]) => createLeaveRequest(...a) };
});
vi.mock('../../services/term.services', () => ({ getCurrentTerm: () => getCurrentTerm() }));
vi.mock('../../services/upload.services', () => ({ uploadFile: (...a: unknown[]) => uploadFile(...a) }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

beforeEach(() => {
  vi.clearAllMocks();
  selected = SECOND;
  wards = [FIRST, SECOND];
  getCurrentTerm.mockResolvedValue(TERM);
  createLeaveRequest.mockResolvedValue({ _id: 'lr-1' });
});

/** Fills in every required field with valid values. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/start date/i), '2099-03-01');
  await user.type(screen.getByLabelText(/end date/i), '2099-03-03');
  await user.selectOptions(screen.getByLabelText(/leave type/i), 'Travel');
  await user.type(screen.getByLabelText(/reason for absence/i), 'Family trip abroad.');
}

describe('LeaveForm — which child the request is for', () => {
  it('submits for the child the parent has selected, not the first in the list', async () => {
    // The old form read parent_students[0] out of localStorage, so a parent
    // with two children always filed leave against the wrong one.
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    await waitFor(() => expect(createLeaveRequest).toHaveBeenCalledTimes(1));
    expect(createLeaveRequest.mock.calls[0][0]).toMatchObject({ child: SECOND.childId });
  });

  it('lets the parent switch which child the request is for', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);

    const picker = await screen.findByLabelText(/which child/i);
    await user.selectOptions(picker, FIRST.childId as string);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    await waitFor(() => expect(createLeaveRequest).toHaveBeenCalled());
    expect(createLeaveRequest.mock.calls[0][0]).toMatchObject({ child: FIRST.childId });
  });

  it('names the child instead of offering a pointless picker when there is only one', async () => {
    wards = [FIRST];
    selected = FIRST;
    renderWithProviders(<LeaveForm />);

    expect(await screen.findByText(/requesting leave for/i)).toHaveTextContent('Amara Okafor');
    expect(screen.queryByLabelText(/which child/i)).not.toBeInTheDocument();
  });
});

describe('LeaveForm — matching the DTO', () => {
  it('sends exactly the fields CreateLeaveRequestDto declares', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    await waitFor(() => expect(createLeaveRequest).toHaveBeenCalled());
    const payload = createLeaveRequest.mock.calls[0][0] as Record<string, unknown>;
    // forbidNonWhitelisted means one extra key is a 400.
    expect(Object.keys(payload).sort()).toEqual(
      ['child', 'endDate', 'leaveType', 'reason', 'startDate', 'term'].sort(),
    );
    expect(payload.term).toBe(TERM._id);
    expect(payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('offers every leave type the API enum accepts', async () => {
    renderWithProviders(<LeaveForm />);
    const select = await screen.findByLabelText(/leave type/i);
    const values = Array.from(select.querySelectorAll('option'))
      .map((option) => option.value)
      .filter(Boolean);
    // The old form offered three of the six.
    expect(values).toEqual([
      'Health Issue',
      'Family Event',
      'Fees Issue',
      'Travel',
      'Emergency',
      'Other',
    ]);
  });

  it('omits the attachments key entirely when no document was chosen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    await waitFor(() => expect(createLeaveRequest).toHaveBeenCalled());
    expect(createLeaveRequest.mock.calls[0][0]).not.toHaveProperty('attachments');
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('uploads a chosen document and sends its URL, not its filename', async () => {
    // The old form sent [file.name], so the school received a bare string it
    // could not open and the file never left the device.
    uploadFile.mockResolvedValue({ url: 'https://files.example/med-cert.pdf' });
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await fillValidForm(user);
    const file = new File(['x'], 'med-cert.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/choose file/i), file);
    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    await waitFor(() => expect(uploadFile).toHaveBeenCalled());
    expect(uploadFile.mock.calls[0][0]).toBe(file);
    await waitFor(() => expect(createLeaveRequest).toHaveBeenCalled());
    expect(createLeaveRequest.mock.calls[0][0]).toMatchObject({
      attachments: ['https://files.example/med-cert.pdf'],
    });
  });
});

describe('LeaveForm — validation and states', () => {
  it('refuses an end date before the start date', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await user.type(screen.getByLabelText(/start date/i), '2099-03-10');
    await user.type(screen.getByLabelText(/end date/i), '2099-03-01');
    await user.selectOptions(screen.getByLabelText(/leave type/i), 'Travel');
    await user.type(screen.getByLabelText(/reason for absence/i), 'Trip');
    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    expect(await screen.findByText(/cannot be before the first day/i)).toBeInTheDocument();
    expect(createLeaveRequest).not.toHaveBeenCalled();
  });

  it('names each missing field rather than one blanket message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    expect(await screen.findByText(/choose the first day/i)).toBeInTheDocument();
    expect(screen.getByText(/choose the last day/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a reason type/i)).toBeInTheDocument();
    expect(screen.getByText(/tell the school why/i)).toBeInTheDocument();
    expect(createLeaveRequest).not.toHaveBeenCalled();
  });

  it('maps the server\'s field errors onto the inputs', async () => {
    const { ApiError } = await import('../../lib/apiError');
    createLeaveRequest.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Some fields need attention.', 400, [
        { field: 'leaveType', reason: 'must be a valid enum value' },
      ]),
    );
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit leave request/i }));

    expect(await screen.findByText(/must be a valid enum value/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows an error with a retry when the term cannot be loaded, not a dead form', async () => {
    const { ApiError } = await import('../../lib/apiError');
    getCurrentTerm.mockRejectedValue(ApiError.unreachable());
    renderWithProviders(<LeaveForm />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit leave request/i })).not.toBeInTheDocument();
  });

  it('does not submit twice while the first submission is in flight', async () => {
    let release: (value: unknown) => void = () => {};
    createLeaveRequest.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const user = userEvent.setup();
    renderWithProviders(<LeaveForm />);
    await screen.findByLabelText(/which child/i);

    await fillValidForm(user);
    const submit = screen.getByRole('button', { name: /submit leave request/i });
    await user.click(submit);
    await user.click(submit);

    expect(createLeaveRequest).toHaveBeenCalledTimes(1);
    release({ _id: 'lr-1' });
  });
});
