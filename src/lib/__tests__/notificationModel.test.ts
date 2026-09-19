import { describe, expect, it } from 'vitest';
import {
  attachmentsOf,
  countNotifications,
  filterNotifications,
  formatDay,
  isAnnouncementCopy,
  normalizeNotification,
  sortNewest,
} from '../notificationModel';
import { categoryLabel } from '../../Components/notifications/categoryMeta';

const USER = 'u1';

describe('normalizeNotification', () => {
  it('categorises by the server type, not by words in the title', () => {
    const item = normalizeNotification(
      { _id: 'a1', type: 'attendance_alert', title: 'Fee payment received', createdAt: '2026-01-01T00:00:00Z' },
      'notification',
      USER,
    );
    expect(item.category).toBe('attendance');
    expect(item.id).toBe('notification:a1');
  });

  it('maps every payment type to payments and falls back to the server category, then to "other"', () => {
    const cat = (type: string, extra: object = {}) =>
      normalizeNotification({ _id: 'x', type, ...extra }, 'notification', USER).category;
    expect(cat('fee_overdue')).toBe('payments');
    expect(cat('receipt_generated')).toBe('payments');
    expect(cat('mystery', { category: 'grading' })).toBe('grading');
    expect(cat('mystery')).toBe('other');
  });

  it('treats an item from the announcements inbox as an announcement by default', () => {
    const item = normalizeNotification({ _id: 'n1', title: 'Term dates' }, 'announcement', USER);
    expect(item.category).toBe('announcement');
    expect(item.sourceLabel).toBe('Announcement');
  });

  it('reads the read state from isRead, read, or readBy', () => {
    expect(normalizeNotification({ _id: '1', isRead: true }, 'notification', USER).isRead).toBe(true);
    expect(normalizeNotification({ _id: '2', readBy: [{ userId: USER }] }, 'announcement', USER).isRead).toBe(true);
    expect(normalizeNotification({ _id: '3', readBy: ['other'] }, 'announcement', USER).isRead).toBe(false);
  });

  it('does not invent a date when the API sent none', () => {
    expect(normalizeNotification({ _id: '1' }, 'notification', USER).createdAt).toBe('');
  });
});

describe('links', () => {
  it('drops attachment and related links that are not http(s) or same-site paths', () => {
    expect(
      attachmentsOf({ attachments: ['https://cdn.test/a.pdf', 'javascript:alert(1)', { url: 'data:text/html,x' }] }),
    ).toEqual([{ url: 'https://cdn.test/a.pdf', name: 'a.pdf' }]);
    const item = normalizeNotification({ _id: '1', metadata: { href: 'javascript:alert(1)', childName: 'Amara' } }, 'notification', USER);
    expect(item.related).toEqual([{ label: 'Amara' }]);
  });
});

describe('lists', () => {
  const items = [
    normalizeNotification({ _id: '1', type: 'attendance_alert', title: 'Absent', createdAt: '2026-01-02T00:00:00Z', isRead: false }, 'notification', USER),
    normalizeNotification({ _id: '2', title: 'Sports day', createdAt: '2026-01-03T00:00:00Z', isRead: true }, 'announcement', USER),
    normalizeNotification({ _id: '3', type: 'fee_reminder', title: 'Fees due', createdAt: '2026-01-01T00:00:00Z', isRead: false }, 'notification', USER),
  ];

  it('sorts newest first and counts per tab', () => {
    expect(sortNewest(items).map((i) => i.rawId)).toEqual(['2', '1', '3']);
    const counts = countNotifications(items);
    expect(counts).toMatchObject({ all: 3, unread: 2, attendance: 1, payments: 1, announcement: 1 });
  });

  it('filters by tab and searches the visible category label too', () => {
    expect(filterNotifications(items, 'unread', '', categoryLabel)).toHaveLength(2);
    expect(filterNotifications(items, 'payments', '', categoryLabel).map((i) => i.rawId)).toEqual(['3']);
    expect(filterNotifications(items, 'all', 'fee & payments', categoryLabel).map((i) => i.rawId)).toEqual(['3']);
  });

  it('spots the feed copy of an announcement so it is not listed twice', () => {
    expect(isAnnouncementCopy({ source: 'school', type: 'announcement' })).toBe(true);
    expect(isAnnouncementCopy({ source: 'school', metadata: { announcementId: 'a' } })).toBe(true);
    expect(isAnnouncementCopy({ source: 'talim', type: 'fee_reminder' })).toBe(false);
  });
});

describe('formatDay', () => {
  it('names today and yesterday', () => {
    const now = new Date('2026-05-10T12:00:00');
    expect(formatDay('2026-05-10T08:00:00', now)).toBe('Today');
    expect(formatDay('2026-05-09T08:00:00', now)).toBe('Yesterday');
    expect(formatDay('nonsense', now)).toBe('');
  });
});
