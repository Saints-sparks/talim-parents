import { describe, expect, it } from 'vitest';
import {
  applyParticipants,
  applyRoomActivity,
  applyRoomJoined,
  applyRoomRead,
  applyRoomUpdated,
  clearRoomUnread,
  removeRoom,
  roomIdOf,
  sortRooms,
} from '../roomStore';
import {
  EMPTY_THREAD,
  withJoinFailed,
  withJoinStarted,
  withJoinedHistory,
  withMessageStatus,
  withMessagesUpdate,
  withOlderFailed,
  withoutUnsentMessage,
} from '../threadStore';
import { describeSendFailure } from '../outbox';
import { ApiError } from '../../../lib/apiError';
import type { ChatLastMessage, ChatMessage, ChatRoomJoined, FetchMessagesAck, RawChatRoom, Thread } from '../../../types/chat';

/** A stored or pending message, overridable per test. */
function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    _id: 'm1',
    senderId: 'u1',
    senderName: 'Ada',
    senderAvatar: null,
    isOwn: false,
    text: 'hi',
    type: 'text',
    attachments: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    readBy: [],
    status: 'sent',
    ...overrides,
  };
}

const ROOMS: RawChatRoom[] = [
  { _id: 'r1', updatedAt: '2026-09-01T10:00:00.000Z', unreadCount: 2 },
  { _id: 'r2', updatedAt: '2026-09-02T10:00:00.000Z', unreadCount: 0 },
];

describe('roomStore', () => {
  it('reads a room id from whichever field the server used', () => {
    expect(roomIdOf({ _id: 'a' })).toBe('a');
    expect(roomIdOf({ roomId: 'b' })).toBe('b');
    expect(roomIdOf({ id: 'c' })).toBe('c');
    expect(roomIdOf(null)).toBe('');
  });

  it('sorts newest activity first without mutating', () => {
    expect(sortRooms(ROOMS).map(roomIdOf)).toEqual(['r2', 'r1']);
    expect(ROOMS.map(roomIdOf)).toEqual(['r1', 'r2']);
  });

  it('shows a new message, bumps the room to the top and counts it unread', () => {
    const last = { preview: 'hello', createdAt: '2026-09-03T10:00:00.000Z' } as ChatLastMessage;
    const next = applyRoomActivity(ROOMS, 'r1', last, true);
    expect(next.map(roomIdOf)).toEqual(['r1', 'r2']);
    expect(next[0].unreadCount).toBe(3);
    expect(next[0].lastMessage?.content).toBe('hello');
  });

  it('does not count an own or open-room message as unread', () => {
    const last = { preview: 'x', createdAt: '2026-09-03T10:00:00.000Z' } as ChatLastMessage;
    expect(applyRoomActivity(ROOMS, 'r1', last, false).find((room) => roomIdOf(room) === 'r1')?.unreadCount).toBe(2);
  });

  it('marks a room read and clears unread', () => {
    expect(applyRoomRead(ROOMS, 'r1', '2026-09-04T00:00:00.000Z')[0]).toMatchObject({
      unreadCount: 0,
      lastReadAt: '2026-09-04T00:00:00.000Z',
    });
    expect(clearRoomUnread(ROOMS, 'r1')[0].unreadCount).toBe(0);
    expect(clearRoomUnread(ROOMS, 'r1')[1]).toBe(ROOMS[1]);
  });

  it('applies only the fields a room-updated event names', () => {
    const next = applyRoomUpdated([{ _id: 'r1', name: 'Old', description: 'keep' }], 'r1', { name: 'New' } as never);
    expect(next[0]).toMatchObject({ name: 'New', description: 'keep' });
  });

  it('replaces members and removes rooms', () => {
    expect(applyParticipants(ROOMS, 'r1', [{ _id: 'u1' }])[0].participants).toEqual([{ _id: 'u1' }]);
    expect(removeRoom(ROOMS, 'r1').map(roomIdOf)).toEqual(['r2']);
  });

  it('adds a joined room the list did not have, and zeroes its unread', () => {
    const joined = { room: { _id: 'r3', updatedAt: '2026-09-05T00:00:00.000Z' }, participants: [] } as unknown as ChatRoomJoined;
    const next = applyRoomJoined(ROOMS, 'r3', joined);
    expect(next.map(roomIdOf)).toEqual(['r3', 'r2', 'r1']);
    expect(next[0].unreadCount).toBe(0);
  });
});

describe('threadStore', () => {
  it('shows a loaded thread while rejoining, and a spinner for a new one', () => {
    expect(withJoinStarted(EMPTY_THREAD).status).toBe('loading');
    expect(withJoinStarted({ ...EMPTY_THREAD, historyLoaded: true }).status).toBe('ready');
  });

  it('keeps history on screen when a rejoin fails, but errors an empty thread', () => {
    const loaded: Thread = { ...EMPTY_THREAD, historyLoaded: true, status: 'ready' };
    expect(withJoinFailed(loaded)).toBe(loaded);
    expect(withJoinFailed(EMPTY_THREAD)).toMatchObject({ status: 'error', error: "Couldn't load this chat" });
  });

  it('takes the paging cursor from the first join only', () => {
    const data = { hasMore: true, nextCursor: 'c1' } as ChatRoomJoined;
    const first = withJoinedHistory(EMPTY_THREAD, [message()], data);
    expect(first).toMatchObject({ hasMore: true, nextCursor: 'c1', historyLoaded: true, status: 'ready' });
    const again = withJoinedHistory(first, [message({ _id: 'm2' })], { hasMore: false, nextCursor: 'c9' } as ChatRoomJoined);
    expect(again).toMatchObject({ hasMore: true, nextCursor: 'c1' });
    expect(again.messages).toHaveLength(2);
  });

  it('moves the cursor for an older page but not for a catch-up page', () => {
    const base: Thread = { ...EMPTY_THREAD, hasMore: true, nextCursor: 'c1', loadingOlder: true };
    const older = withMessagesUpdate(base, [], { direction: 'before', hasMore: false, nextCursor: null } as FetchMessagesAck);
    expect(older).toMatchObject({ hasMore: false, nextCursor: null, loadingOlder: false });
    const newer = withMessagesUpdate(base, [], { direction: 'after' } as FetchMessagesAck);
    expect(newer).toMatchObject({ hasMore: true, nextCursor: 'c1' });
  });

  it('only changes the status of an unsent message', () => {
    const pending = message({ _id: undefined, clientMessageId: 'c1', status: 'pending' });
    const stored = message({ _id: 'm9', clientMessageId: 'c1' });
    const thread: Thread = { ...EMPTY_THREAD, messages: [pending, stored] };
    const next = withMessageStatus(thread, 'c1', 'failed', 'Not sent');
    expect(next.messages[0]).toMatchObject({ status: 'failed', error: 'Not sent' });
    expect(next.messages[1].status).toBe('sent');
  });

  it('discards an unsent message but never a stored one', () => {
    const thread: Thread = {
      ...EMPTY_THREAD,
      messages: [message({ _id: undefined, clientMessageId: 'c1', status: 'failed' }), message({ _id: 'm9', clientMessageId: 'c1' })],
    };
    expect(withoutUnsentMessage(thread, 'c1').messages.map((item) => item._id)).toEqual(['m9']);
  });

  it('words an older-messages failure differently offline', () => {
    expect(withOlderFailed(EMPTY_THREAD, true).olderError).toBe("You're offline");
    expect(withOlderFailed(EMPTY_THREAD, false).olderError).toBe("Couldn't load older messages");
  });
});

describe('describeSendFailure', () => {
  const uploaded = { items: [{ uploaded: true }] } as never;
  const missing = { items: [{ uploaded: false }] } as never;

  it("shows the API's message for a failed upload", () => {
    expect(describeSendFailure(new ApiError('VALIDATION_FAILED', 'File too large', 400), missing)).toBe('File too large');
  });

  it("shows the server's message for a rejected send", () => {
    expect(describeSendFailure(Object.assign(new Error('Room closed'), { ack: true }), uploaded)).toBe('Room closed');
  });

  it('says Upload failed while files are missing, Not sent once they are up', () => {
    expect(describeSendFailure(new Error('x'), missing)).toBe('Upload failed');
    expect(describeSendFailure(new Error('x'), uploaded)).toBe('Not sent');
  });
});
