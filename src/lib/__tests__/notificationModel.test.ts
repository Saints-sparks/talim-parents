import { describe, expect, it } from 'vitest';
import { attachmentsOf, normalizeNotification } from '../notificationModel';

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

describe('the redesign fields', () => {
  it('reads the target, action label, child and school, and ignores malformed ones', () => {
    const item = normalizeNotification(
      {
        _id: 'n1',
        title: 'Fee reminder',
        category: 'payments',
        school: { id: 's1', name: 'Easy Sparks' },
        metadata: { childId: 'c1', target: { page: 'payments' }, actionLabel: 'Open Payments' },
      },
      'notification',
      USER,
    );
    expect(item).toMatchObject({ category: 'payments', childId: 'c1', target: { page: 'payments' }, actionLabel: 'Open Payments', school: { name: 'Easy Sparks' } });
    const bare = normalizeNotification({ _id: 'n2', metadata: { target: 'payments' } }, 'notification', USER);
    expect(bare).toMatchObject({ target: null, actionLabel: null, childId: null, school: null });
  });

  it('reads a dashboard feed item (FeedItemDto): id, and target and label at the top level', () => {
    const item = normalizeNotification(
      {
        id: 'f1',
        title: 'Results published',
        message: 'First term totals are visible.',
        category: 'grading',
        createdAt: '2026-10-03T08:00:00.000Z',
        isRead: false,
        senderName: null,
        target: { page: 'results', termId: 't1' },
        actionLabel: 'Open Results',
        school: { id: 's1', name: 'Greenfield' },
        metadata: { childId: 'c1' },
      },
      'notification',
      USER,
    );
    expect(item).toMatchObject({ rawId: 'f1', target: { page: 'results', termId: 't1' }, actionLabel: 'Open Results', childId: 'c1', isRead: false });
  });

  it('files leave updates under leave', () => {
    expect(normalizeNotification({ _id: 'n3', type: 'leave_request_update' }, 'notification', USER).category).toBe('leave');
  });
});
