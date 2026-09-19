import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test-utils/render';

const getNotifications = vi.fn();
const getAnnouncements = vi.fn();
const markAsRead = vi.fn();

vi.mock('../../services/auth.services', () => ({ useAuth: () => ({ parentId: 'u1', isAuthenticated: true }) }));
vi.mock('../../contexts/WebSocketContext', () => ({ useWebSocketContextSafe: () => null }));
vi.mock('../../services/notification.services', () => ({
  getNotifications: (...a: unknown[]) => getNotifications(...a),
  getAnnouncements: (...a: unknown[]) => getAnnouncements(...a),
  markAsRead: (...a: unknown[]) => markAsRead(...a),
  markAllNotificationsAsRead: vi.fn().mockResolvedValue({}),
  markAnnouncementAsRead: vi.fn().mockResolvedValue({}),
}));

import Notifications from '../Notifications';

const page = (data: object[], pageNo = 1, lastPage = 1) => ({ data, meta: { total: data.length, page: pageNo, lastPage, limit: 30 } });

describe('Notifications page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAnnouncements.mockResolvedValue(page([]));
    getNotifications.mockResolvedValue(
      page([
        { _id: 'n1', type: 'attendance_alert', title: 'Amara was absent', message: 'Absent on Monday', createdAt: '2026-01-02T09:00:00Z', isRead: false },
        { _id: 'n2', type: 'fee_reminder', title: 'Fees due Friday', message: 'Third term fees', createdAt: '2026-01-01T09:00:00Z', isRead: true },
      ]),
    );
    markAsRead.mockResolvedValue({});
  });

  it('lists real notifications and filters by category tab', async () => {
    renderWithProviders(<Notifications />);
    expect(await screen.findAllByText('Amara was absent')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('tab', { name: /fee & payments/i }));
    expect(screen.getAllByText('Fees due Friday').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /amara was absent/i })).not.toBeInTheDocument();
  });

  it('marks an unread item read when it is opened', async () => {
    renderWithProviders(<Notifications />);
    await userEvent.click(await screen.findByRole('button', { name: /amara was absent/i }));
    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith('notification:n1'));
  });

  it('has no delete button and no fake pager', async () => {
    renderWithProviders(<Notifications />);
    await screen.findAllByText('Amara was absent');
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load older/i })).not.toBeInTheDocument();
  });

  it('offers to load older items only when the server has another page', async () => {
    getNotifications.mockResolvedValue(page([{ _id: 'n1', title: 'Newest', createdAt: '2026-01-02T00:00:00Z' }], 1, 2));
    renderWithProviders(<Notifications />);
    expect(await screen.findByRole('button', { name: /load older/i })).toBeInTheDocument();
  });

  it('shows an error state with a retry when nothing could be loaded', async () => {
    getNotifications.mockRejectedValue(new Error('down'));
    getAnnouncements.mockRejectedValue(new Error('down'));
    renderWithProviders(<Notifications />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('says so when there is nothing at all', async () => {
    getNotifications.mockResolvedValue(page([]));
    renderWithProviders(<Notifications />);
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
  });
});
