import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILDREN } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import Leave from '../Leave';
import { validateLeave } from '../../Components/portal/leave/leaveForm';

vi.setConfig({ testTimeout: 20_000 });
const MUSA = CHILDREN[0];

describe('Leave requests (fixtures)', () => {
  it('lists the session requests with Pending, Approved and Declined, and edit/delete only while pending', async () => {
    renderPortal(<Leave />);
    expect(await screen.findByText('4 requests this session')).toBeInTheDocument();
    const list = screen.getByRole('region', { name: 'Past requests' });
    expect(within(list).getByText('Medical appointment')).toBeInTheDocument();
    expect(within(list).getByText('Declined')).toBeInTheDocument();
    expect(within(list).getAllByText('Approved')).toHaveLength(2);
    expect(within(list).getAllByRole('button', { name: /^Edit/ })).toHaveLength(1);
    expect(within(list).getAllByRole('button', { name: /^Delete/ })).toHaveLength(1);
  });

  it('sends a new request with the new leave types and the child header', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Leave />);
    await screen.findByText('4 requests this session');
    await user.selectOptions(screen.getByLabelText('Reason for leave'), 'religious');
    await user.type(screen.getByLabelText('From'), '2026-10-20');
    await user.type(screen.getByLabelText('To'), '2026-10-21');
    await user.type(screen.getByLabelText('Note to the teacher'), 'Eid celebration.');
    await user.click(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByText(/Sent to the class teacher/)).toBeInTheDocument();
    const post = requestsTo(fixtures, '/leave').find((r) => r.method === 'POST');
    expect(post?.body).toEqual({ type: 'religious', startDate: '2026-10-20', endDate: '2026-10-21', note: 'Eid celebration.' });
    expect(post?.headers[CHILD_HEADER]).toBe(MUSA.id);
    expect(await screen.findByText('5 requests this session')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Past requests' })).getByText('Religious observance')).toBeInTheDocument();
  });

  it('edits and withdraws a pending request', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Leave />);
    await screen.findByText('4 requests this session');
    await user.click(screen.getByRole('button', { name: /^Edit/ }));
    expect(screen.getByRole('heading', { name: 'Edit request' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Reason for leave'), 'illness');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/Changes saved/)).toBeInTheDocument();
    expect(requestsTo(fixtures, '/leave/').find((r) => r.method === 'PATCH')?.body).toEqual(expect.objectContaining({ type: 'illness' }));

    await user.click(await screen.findByRole('button', { name: /^Delete/ }));
    expect(await screen.findByText(/Request withdrawn/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('3 requests this session')).toBeInTheDocument(), { timeout: 3000 }).catch((error) => {
      console.log(JSON.stringify(fixtures.requests.map((r) => [r.method, r.path])));
      throw error;
    });
  });

  it('checks the dates before sending', async () => {
    const user = userEvent.setup();
    const { fixtures } = renderPortal(<Leave />);
    await screen.findByText('4 requests this session');
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(screen.getByText('Choose the first day of leave.')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveFocus();
    expect(requestsTo(fixtures, '/leave').filter((r) => r.method === 'POST')).toHaveLength(0);
  });

  it('shows the no-class state', async () => {
    renderPortal(<Leave />, { scenario: 'no-class' });
    expect(await screen.findByText('Musa is not in a class yet')).toBeInTheDocument();
  });
});

describe('validateLeave', () => {
  it('needs a first day and an end on or after it', () => {
    expect(validateLeave({ type: 'other', startDate: '', endDate: '', note: '' }).startDate).toBeDefined();
    expect(validateLeave({ type: 'other', startDate: '2026-10-05', endDate: '2026-10-04', note: '' }).endDate).toBeDefined();
    expect(validateLeave({ type: 'other', startDate: '2026-10-05', endDate: '', note: '' })).toEqual({});
  });
});
