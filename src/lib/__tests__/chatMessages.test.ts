import { describe, it, expect, vi } from 'vitest';
import {
  LEAVABLE_ROOM_TYPES,
  applyMessagesRead,
  createClientMessageId,
  formatDaySeparator,
  formatMessageTime,
  formatRoleLabel,
  isAtOrBefore,
  mergeMessages,
  newestIncomingMessage,
  newestSavedMessageId,
  normalizeAttachment,
  normalizeMessage,
  receiptOf,
  toId,
} from '../chatMessages';
import type { ChatMessage } from '../../types/chat';

/** A stored message with sensible defaults, overriding only what a test cares about. */
function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    _id: 'm1',
    roomId: 'r1',
    senderId: 'u-other',
    senderName: 'Ada',
    senderAvatar: null,
    isOwn: false,
    text: 'hi',
    type: 'text',
    attachments: [],
    createdAt: '2026-05-01T10:00:00.000Z',
    readBy: [],
    status: 'sent',
    ...overrides,
  };
}

describe('toId', () => {
  it('reads strings, populated objects and ObjectId-likes', () => {
    expect(toId('abc')).toBe('abc');
    expect(toId({ _id: 'x1' })).toBe('x1');
    expect(toId({ userId: 'x2' })).toBe('x2');
    expect(toId({ id: 'x3' })).toBe('x3');
    expect(toId({ toString: () => 'x4' })).toBe('x4');
  });

  it('gives an empty string for nothing', () => {
    expect(toId(null)).toBe('');
    expect(toId(undefined)).toBe('');
    expect(toId('')).toBe('');
  });
});

describe('createClientMessageId', () => {
  it('is unique per call', () => {
    expect(createClientMessageId()).not.toBe(createClientMessageId());
  });
});

describe('normalizeAttachment', () => {
  it('turns a URL string into an object named after the file', () => {
    expect(normalizeAttachment('https://cdn.example.com/files/report%20one.pdf?sig=1')).toEqual({
      url: 'https://cdn.example.com/files/report%20one.pdf?sig=1',
      name: 'report one.pdf',
      type: 'document',
    });
  });

  it('reads older field names and infers the type', () => {
    const result = normalizeAttachment({ secure_url: 'https://x/y.png', originalName: 'y.png', mimetype: 'image/png' });
    expect(result).toMatchObject({ url: 'https://x/y.png', name: 'y.png', mimeType: 'image/png', type: 'image' });
  });

  it('maps a "voice" type to audio and reads a .webm as audio', () => {
    expect(normalizeAttachment({ url: 'https://x/a.m4a', type: 'voice' })?.type).toBe('audio');
    expect(normalizeAttachment({ url: 'https://x/a.webm' })?.type).toBe('audio');
  });

  it('treats video/* as audio inside a voice message', () => {
    expect(normalizeAttachment({ url: 'https://x/a', mimeType: 'video/webm' }, 'voice')?.type).toBe('audio');
    expect(normalizeAttachment({ url: 'https://x/a', mimeType: 'video/webm' }, 'file')?.type).toBe('video');
  });

  it('returns null for nothing', () => {
    expect(normalizeAttachment(null)).toBeNull();
    expect(normalizeAttachment('')).toBeNull();
  });
});

describe('normalizeMessage', () => {
  it('reads the canonical fields', () => {
    const result = normalizeMessage(
      {
        _id: 'm1',
        roomId: 'r1',
        sender: { _id: 'u1', name: 'Grace Hopper', avatar: 'https://x/a.png' },
        text: 'Hello',
        type: 'text',
        createdAt: '2026-05-01T10:00:00.000Z',
        readBy: ['u2', { _id: 'u3' }],
      },
      'u1',
    );
    expect(result).toMatchObject({
      id: 'm1',
      _id: 'm1',
      roomId: 'r1',
      senderId: 'u1',
      senderName: 'Grace Hopper',
      senderAvatar: 'https://x/a.png',
      isOwn: true,
      text: 'Hello',
      type: 'text',
      createdAt: '2026-05-01T10:00:00.000Z',
      readBy: ['u2', 'u3'],
      status: 'sent',
    });
  });

  it('falls back to the deprecated aliases', () => {
    const result = normalizeMessage({
      _id: 'm2',
      chatRoomId: 'r9',
      senderId: { _id: 'u5', firstName: 'Alan', lastName: 'Turing', userAvatar: 'https://x/t.png' },
      content: 'old text',
      timestamp: '2026-05-02T08:00:00.000Z',
    });
    expect(result).toMatchObject({
      roomId: 'r9',
      senderId: 'u5',
      senderName: 'Alan Turing',
      senderAvatar: 'https://x/t.png',
      text: 'old text',
      createdAt: '2026-05-02T08:00:00.000Z',
      isOwn: false,
    });
  });

  it('uses the fallback room and "Unknown" when the payload names neither', () => {
    const result = normalizeMessage({ _id: 'm3' }, 'u1', 'r-fallback');
    expect(result.roomId).toBe('r-fallback');
    expect(result.senderName).toBe('Unknown');
    expect(result.isOwn).toBe(false);
    expect(result.createdAt).toBeNull();
  });

  it('is never "own" without a current user id', () => {
    expect(normalizeMessage({ senderId: '' }, '').isOwn).toBe(false);
    expect(normalizeMessage({ senderId: 'u1' }, undefined).isOwn).toBe(false);
  });

  it('drops attachments without a URL and derives the message type', () => {
    const voice = normalizeMessage({
      _id: 'v1',
      type: 'text',
      attachments: [{ url: 'https://x/n.m4a', duration: 12 }, { name: 'no-url' }],
    });
    expect(voice.attachments).toHaveLength(1);
    expect(voice.type).toBe('voice');
    expect(voice.duration).toBe(12);

    const photo = normalizeMessage({ attachments: [{ url: 'https://x/p.jpg' }] });
    expect(photo.type).toBe('image');

    const doc = normalizeMessage({ attachments: [{ url: 'https://x/d.pdf' }] });
    expect(doc.type).toBe('file');

    expect(normalizeMessage({ text: 'plain' }).type).toBe('text');
  });

  it('keeps an explicit non-text type', () => {
    expect(normalizeMessage({ type: 'voice', attachments: [{ url: 'https://x/a.mp3' }] }).type).toBe('voice');
  });

  it('uses the client id when the server has not stored it yet', () => {
    const result = normalizeMessage({ clientMessageId: 'c1', text: 'x' });
    expect(result.id).toBe('c1');
    expect(result._id).toBeUndefined();
  });
});

describe('mergeMessages', () => {
  it('returns the same array when there is nothing to add', () => {
    const existing = [message()];
    expect(mergeMessages(existing, [])).toBe(existing);
  });

  it('dedupes by _id, letting the newer copy win', () => {
    const merged = mergeMessages([message({ text: 'old' })], [message({ text: 'new', readBy: ['u2'] })]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ text: 'new', readBy: ['u2'] });
  });

  it('sorts saved messages by time, then _id', () => {
    const merged = mergeMessages(
      [message({ _id: 'b', id: 'b', createdAt: '2026-05-01T10:00:00.000Z' })],
      [
        message({ _id: 'c', id: 'c', createdAt: '2026-05-01T11:00:00.000Z' }),
        message({ _id: 'a', id: 'a', createdAt: '2026-05-01T10:00:00.000Z' }),
        message({ _id: 'z', id: 'z', createdAt: '2026-05-01T09:00:00.000Z' }),
      ],
    );
    expect(merged.map((item) => item._id)).toEqual(['z', 'a', 'b', 'c']);
  });

  it('replaces a pending bubble when its clientMessageId comes back stored', () => {
    const pending = message({
      _id: undefined,
      id: 'c1',
      clientMessageId: 'c1',
      isOwn: true,
      status: 'pending',
      text: 'sending',
    });
    const stored = message({ _id: 'm9', id: 'm9', clientMessageId: 'c1', isOwn: true, text: 'sending' });
    const merged = mergeMessages([message({ _id: 'm1' }), pending], [stored]);
    expect(merged.map((item) => item._id)).toEqual(['m1', 'm9']);
    expect(merged.some((item) => item.status === 'pending')).toBe(false);
  });

  it('drops a pending bubble whose stored copy is already in the list', () => {
    const stored = message({ _id: 'm9', id: 'm9', clientMessageId: 'c1', isOwn: true });
    const pending = message({ _id: undefined, id: 'c1', clientMessageId: 'c1', isOwn: true, status: 'pending' });
    const merged = mergeMessages([stored], [pending]);
    expect(merged).toHaveLength(1);
    expect(merged[0]._id).toBe('m9');
  });

  it('keeps unsent bubbles after every saved message', () => {
    const pending = message({
      _id: undefined,
      id: 'c2',
      clientMessageId: 'c2',
      isOwn: true,
      status: 'pending',
      createdAt: '2026-05-01T00:00:00.000Z',
    });
    const merged = mergeMessages([pending], [message({ _id: 'late', id: 'late', createdAt: '2026-05-09T00:00:00.000Z' })]);
    expect(merged.map((item) => item.clientMessageId ?? item._id)).toEqual(['late', 'c2']);
  });

  it('updates a pending bubble in place (a failed status, upload progress)', () => {
    const pending = message({ _id: undefined, id: 'c3', clientMessageId: 'c3', isOwn: true, status: 'pending' });
    const merged = mergeMessages([pending], [{ ...pending, status: 'failed', error: 'Not sent' }]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ status: 'failed', error: 'Not sent' });
  });
});

describe('isAtOrBefore', () => {
  const position = { id: 'm5', time: new Date('2026-05-01T10:00:00.000Z').getTime() };

  it('is false without a message or a position', () => {
    expect(isAtOrBefore(null, position)).toBe(false);
    expect(isAtOrBefore(message(), undefined)).toBe(false);
  });

  it('compares time first, then id', () => {
    expect(isAtOrBefore({ _id: 'm9', createdAt: '2026-05-01T09:59:59.000Z' }, position)).toBe(true);
    expect(isAtOrBefore({ _id: 'm1', createdAt: '2026-05-01T10:00:00.000Z' }, position)).toBe(true);
    expect(isAtOrBefore({ _id: 'm5', createdAt: '2026-05-01T10:00:00.000Z' }, position)).toBe(true);
    expect(isAtOrBefore({ _id: 'm6', createdAt: '2026-05-01T10:00:00.000Z' }, position)).toBe(false);
    expect(isAtOrBefore({ _id: 'm1', createdAt: '2026-05-01T10:00:01.000Z' }, position)).toBe(false);
  });
});

describe('newestIncomingMessage / newestSavedMessageId', () => {
  const list = [
    message({ _id: 'a', id: 'a' }),
    message({ _id: 'b', id: 'b', isOwn: true }),
    message({ _id: undefined, id: 'c1', clientMessageId: 'c1', isOwn: true, status: 'pending' }),
  ];

  it('finds the newest stored message from someone else', () => {
    expect(newestIncomingMessage(list)?._id).toBe('a');
    expect(newestIncomingMessage([])).toBeNull();
  });

  it('finds the newest stored message of anyone', () => {
    expect(newestSavedMessageId(list)).toBe('b');
    expect(newestSavedMessageId([])).toBeNull();
  });
});

describe('applyMessagesRead', () => {
  const list = [
    message({ _id: 'a', id: 'a', createdAt: '2026-05-01T10:00:00.000Z', senderId: 'me', isOwn: true }),
    message({ _id: 'b', id: 'b', createdAt: '2026-05-01T11:00:00.000Z', senderId: 'me', isOwn: true }),
    message({ _id: 'c', id: 'c', createdAt: '2026-05-01T12:00:00.000Z', senderId: 'them' }),
  ];

  it('adds the reader to messages created up to readAt, from other senders', () => {
    const next = applyMessagesRead(list, { userId: 'them', readAt: '2026-05-01T11:00:00.000Z' });
    expect(next[0].readBy).toEqual(['them']);
    expect(next[1].readBy).toEqual(['them']);
    // Later than readAt, and the reader's own message.
    expect(next[2].readBy).toEqual([]);
  });

  it('returns the same array when nothing changes', () => {
    const once = applyMessagesRead(list, { userId: 'them', readAt: '2026-05-01T11:00:00.000Z' });
    expect(applyMessagesRead(once, { userId: 'them', readAt: '2026-05-01T11:00:00.000Z' })).toBe(once);
  });

  it('ignores an unusable reader or time', () => {
    expect(applyMessagesRead(list, { userId: '', readAt: '2026-05-01T11:00:00.000Z' })).toBe(list);
    expect(applyMessagesRead(list, { userId: 'them', readAt: 'not a date' })).toBe(list);
    expect(applyMessagesRead(list, {})).toBe(list);
  });

  it('does not touch unsent bubbles', () => {
    const pending = message({ _id: undefined, id: 'c1', clientMessageId: 'c1', isOwn: true, status: 'pending' });
    expect(applyMessagesRead([pending], { userId: 'them', readAt: '2030-01-01T00:00:00.000Z' })).toEqual([pending]);
  });
});

describe('receiptOf', () => {
  const own = message({ isOwn: true, senderId: 'me' });

  it('is null for messages from others', () => {
    expect(receiptOf(message())).toBeNull();
    expect(receiptOf(null)).toBeNull();
  });

  it('reports failed and pending', () => {
    expect(receiptOf({ ...own, status: 'failed' })).toEqual({ state: 'failed', readCount: 0 });
    expect(receiptOf({ ...own, status: 'pending' })).toEqual({ state: 'pending', readCount: 0 });
    expect(receiptOf({ ...own, _id: undefined })).toEqual({ state: 'pending', readCount: 0 });
  });

  it('is sent until the other person has read a 1:1 message', () => {
    expect(receiptOf(own, { otherUserId: 'them' })).toEqual({ state: 'sent', readCount: 0 });
    expect(receiptOf({ ...own, readBy: ['them'] }, { otherUserId: 'them', currentUserId: 'me' })).toEqual({
      state: 'read',
      readCount: 1,
    });
  });

  it('never shows "read" in a group but counts readers without the sender', () => {
    const readBy = ['me', 'a', 'b'];
    expect(receiptOf({ ...own, readBy }, { isGroup: true, otherUserId: 'a', currentUserId: 'me' })).toEqual({
      state: 'sent',
      readCount: 2,
    });
  });
});

describe('formatRoleLabel', () => {
  it('uses the known labels', () => {
    expect(formatRoleLabel('teacher')).toBe('Teacher');
    expect(formatRoleLabel('school_admin')).toBe('School admin');
    expect(formatRoleLabel('school_sub_admin')).toBe('School sub-admin');
  });

  it('humanises unknown roles', () => {
    expect(formatRoleLabel('bursar_officer')).toBe('Bursar officer');
    expect(formatRoleLabel('head-teacher')).toBe('Head teacher');
  });

  it('is empty for no role', () => {
    expect(formatRoleLabel('')).toBe('');
    expect(formatRoleLabel(null)).toBe('');
    expect(formatRoleLabel(undefined)).toBe('');
  });
});

describe('LEAVABLE_ROOM_TYPES', () => {
  it('lets members leave custom and parent groups only', () => {
    expect(LEAVABLE_ROOM_TYPES).toEqual(['custom_group', 'parent_group']);
  });
});

describe('formatMessageTime / formatDaySeparator', () => {
  it('is empty for missing or invalid times', () => {
    expect(formatMessageTime(null)).toBe('');
    expect(formatMessageTime('nope')).toBe('');
    expect(formatDaySeparator('nope')).toBe('');
    expect(formatDaySeparator(undefined)).toBe('');
  });

  it('shows only the time for today, and Today / Yesterday on the divider', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    expect(formatMessageTime(now)).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/);
    expect(formatDaySeparator(now)).toBe('Today');
    expect(formatDaySeparator(yesterday)).toBe('Yesterday');
  });

  it('adds the date for other days, and the year for other years', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0));
    try {
      expect(formatMessageTime(new Date(2026, 0, 2, 9, 30))).toMatch(/^Jan 2, 9:30\s?AM$/);
      expect(formatMessageTime(new Date(2001, 2, 4, 15, 5))).toMatch(/^Mar 4, 2001, 3:05\s?PM$/);
      expect(formatDaySeparator(new Date(2026, 0, 2))).toBe('Fri, Jan 2');
      expect(formatDaySeparator(new Date(2001, 2, 4))).toBe('Sun, Mar 4, 2001');
    } finally {
      vi.useRealTimers();
    }
  });
});
