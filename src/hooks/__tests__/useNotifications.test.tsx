import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test-utils/render';

const getNotifications = vi.fn();
const getAnnouncements = vi.fn();
const markAsRead = vi.fn();
const markAllNotificationsAsRead = vi.fn();
const markAnnouncementAsRead = vi.fn();
const handlers = new Map<string, (payload: unknown) => void>();

vi.mock('../../services/auth.services', () => ({ useAuth: () => ({ parentId: 'u1', isAuthenticated: true }) }));
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocketContextSafe: () => ({
    on: (event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);
      return () => handlers.delete(event);
    },
  }),
}));
vi.mock('../../services/notification.services', () => ({
  getNotifications: (...a: unknown[]) => getNotifications(...a),
  getAnnouncements: (...a: unknown[]) => getAnnouncements(...a),
  markAsRead: (...a: unknown[]) => markAsRead(...a),
  markAllNotificationsAsRead: () => markAllNotificationsAsRead(),
  markAnnouncementAsRead: (...a: unknown[]) => markAnnouncementAsRead(...a),
}));

import { useNotifications } from '../useNotifications';
import { useNotificationRealtime } from '../useNotificationRealtime';

const page = (data: object[], pageNo = 1, lastPage = 1) => ({ data, meta: { total: data.length, page: pageNo, lastPage, limit: 30 } });

/** Both hooks against one client, as the shell mounts them. */
function setup() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const view = renderHook(
    () => {
      useNotificationRealtime();
      return useNotifications();
    },
    { wrapper },
  );
  return view;
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    getNotifications.mockResolvedValue(page([{ _id: 'n1', type: 'attendance_alert', title: 'Absent', createdAt: '2026-01-02T00:00:00Z', isRead: false }]));
    getAnnouncements.mockResolvedValue(page([{ _id: 'a1', title: 'Sports day', createdAt: '2026-01-03T00:00:00Z', readBy: [] }]));
  });

  it('merges both inboxes, newest first, from the API and never polls', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications.map((n) => n.id)).toEqual(['announcement:a1', 'notification:n1']);
    expect(result.current.counts.unread).toBe(2);
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(getNotifications).toHaveBeenCalledWith({ page: 1, limit: 30 });
  });

  it('adds a live notification from the socket without refetching', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => handlers.get('notification')?.({ _id: 'n2', type: 'fee_reminder', title: 'Fees due', message: 'Pay', createdAt: '2026-01-04T00:00:00Z' }));
    await waitFor(() => expect(result.current.notifications[0].id).toBe('notification:n2'));
    expect(result.current.notifications[0].category).toBe('payments');
    expect(getNotifications).toHaveBeenCalledTimes(1);
  });

  it('ignores chat messages and refetches announcements instead of duplicating them', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => handlers.get('notification')?.({ _id: 'c1', type: 'chat_message' }));
    expect(result.current.notifications).toHaveLength(2);
    act(() => handlers.get('notification')?.({ _id: 'x', type: 'announcement' }));
    await waitFor(() => expect(getAnnouncements).toHaveBeenCalledTimes(2));
    expect(result.current.notifications).toHaveLength(2);
  });

  it('marks one item read immediately and rolls back when the server refuses', async () => {
    markAsRead.mockRejectedValue(new Error('nope'));
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.markAsRead('notification:n1').catch(() => undefined);
    });
    expect(markAsRead).toHaveBeenCalledWith('notification:n1');
    // The rollback refetch restores the server's view.
    await waitFor(() => expect(result.current.notifications.find((n) => n.id === 'notification:n1')?.isRead).toBe(false));
  });

  it('marks everything read with one request for notifications plus one per unread announcement', async () => {
    markAllNotificationsAsRead.mockResolvedValue({ message: 'ok' });
    markAnnouncementAsRead.mockResolvedValue({});
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.markAllAsRead();
    });
    expect(markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
    expect(markAnnouncementAsRead).toHaveBeenCalledWith('a1');
    await waitFor(() => expect(result.current.counts.unread).toBe(0));
  });

  it('reports an error only when neither inbox could be loaded', async () => {
    getNotifications.mockRejectedValue(new Error('down'));
    const { result } = setup();
    await waitFor(() => expect(result.current.partialError).toBe(true));
    expect(result.current.error).toBeNull();
    expect(result.current.notifications).toHaveLength(1);
  });
});
