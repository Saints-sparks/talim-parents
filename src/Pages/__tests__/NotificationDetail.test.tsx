import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils/render';
import NotificationDetail from '../NotificationDetail';
import { ApiError } from '../../lib/apiError';

const getNotificationById = vi.fn();
const getAnnouncementById = vi.fn();
const markNotificationAsRead = vi.fn();
const markAnnouncementAsRead = vi.fn();

vi.mock('../../lib/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/apiClient')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: (url: string) =>
        url.includes('/announcements/') ? getAnnouncementById(url) : getNotificationById(url),
      put: (url: string) =>
        url.includes('/announcements/') ? markAnnouncementAsRead(url) : markNotificationAsRead(url),
    },
  };
});

const NOTIFICATION_ID = '65b0000000000000000000aa';
const ANNOUNCEMENT_ID = '65b0000000000000000000bb';

/** Renders the page at a detail route so `useParams` sees an id. */
function renderAt(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/notifications/:id" element={<NotificationDetail />} />
    </Routes>,
    { route: `/notifications/${id}` },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  markNotificationAsRead.mockResolvedValue({});
  markAnnouncementAsRead.mockResolvedValue({});
});

describe('NotificationDetail', () => {
  it('renders a real notification from the API, not placeholder data', async () => {
    getNotificationById.mockResolvedValue({
      _id: NOTIFICATION_ID,
      title: 'Amara was marked absent',
      message: 'Amara Okafor was marked absent on 12 June.',
      createdAt: '2026-06-12T08:30:00.000Z',
      senderName: 'Bright Star Academy',
      sourceLabel: 'School Notification',
      isRead: false,
    });

    renderAt(NOTIFICATION_ID);

    expect(await screen.findByRole('heading', { name: /amara was marked absent/i })).toBeInTheDocument();
    expect(screen.getByText(/marked absent on 12 june/i)).toBeInTheDocument();
    expect(screen.getByText('Bright Star Academy')).toBeInTheDocument();
    expect(getNotificationById).toHaveBeenCalledWith(`/notifications/${NOTIFICATION_ID}`);
  });

  it('shows a loading state first, and never an empty shell', () => {
    getNotificationById.mockReturnValue(new Promise(() => {}));
    renderAt(NOTIFICATION_ID);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('marks the notification read on open, using the route that takes no user id', async () => {
    getNotificationById.mockResolvedValue({ _id: NOTIFICATION_ID, title: 'Hi', isRead: false });
    renderAt(NOTIFICATION_ID);

    await screen.findByRole('heading', { name: 'Hi' });
    await waitFor(() =>
      expect(markNotificationAsRead).toHaveBeenCalledWith(`/notifications/${NOTIFICATION_ID}/read`),
    );
  });

  it('does not re-mark a notification that is already read', async () => {
    getNotificationById.mockResolvedValue({ _id: NOTIFICATION_ID, title: 'Hi', isRead: true });
    renderAt(NOTIFICATION_ID);

    await screen.findByRole('heading', { name: 'Hi' });
    await waitFor(() => expect(markNotificationAsRead).not.toHaveBeenCalled());
  });

  it('marks it read exactly once, not once per render', async () => {
    getNotificationById.mockResolvedValue({ _id: NOTIFICATION_ID, title: 'Hi', isRead: false });
    const { rerender } = renderAt(NOTIFICATION_ID);

    await screen.findByRole('heading', { name: 'Hi' });
    rerender(
      <Routes>
        <Route path="/notifications/:id" element={<NotificationDetail />} />
      </Routes>,
    );
    await waitFor(() => expect(markNotificationAsRead).toHaveBeenCalledTimes(1));
  });

  it('routes an announcement id to the announcements endpoint', async () => {
    getAnnouncementById.mockResolvedValue({
      _id: ANNOUNCEMENT_ID,
      title: 'Mid-term break',
      content: 'School closes on Friday.',
      isRead: false,
    });

    renderAt(`announcement:${ANNOUNCEMENT_ID}`);

    expect(await screen.findByRole('heading', { name: /mid-term break/i })).toBeInTheDocument();
    expect(getAnnouncementById).toHaveBeenCalledWith(
      `/notifications/announcements/${ANNOUNCEMENT_ID}`,
    );
    expect(getNotificationById).not.toHaveBeenCalled();
  });

  it("shows a not-found state for another parent's notification, with no way to tell it apart from a deleted one", async () => {
    // The server answers 404 rather than 403 precisely so a parent cannot
    // probe which ids exist. The UI must not undo that by saying "forbidden".
    getNotificationById.mockRejectedValue(new ApiError('NOT_FOUND', 'Notification not found', 404));
    renderAt(NOTIFICATION_ID);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no longer available/i);
    expect(alert).not.toHaveTextContent(/forbidden|access|permission/i);
  });

  it('offers a retry when the request failed for a transient reason', async () => {
    getNotificationById.mockRejectedValue(ApiError.unreachable());
    renderAt(NOTIFICATION_ID);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('refuses an id that could never address a notification, without calling the API', async () => {
    renderAt('not-an-object-id');
    expect(await screen.findByText(/notification not found/i)).toBeInTheDocument();
    expect(getNotificationById).not.toHaveBeenCalled();
  });

  it('lists attachments as links', async () => {
    getNotificationById.mockResolvedValue({
      _id: NOTIFICATION_ID,
      title: 'Term report',
      attachments: [{ url: 'https://files.example/report.pdf', name: 'report.pdf' }],
      isRead: true,
    });

    renderAt(NOTIFICATION_ID);

    const link = await screen.findByRole('link', { name: /report\.pdf/i });
    expect(link).toHaveAttribute('href', 'https://files.example/report.pdf');
  });
});
