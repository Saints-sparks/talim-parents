import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILDREN, PARENT } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import type { ChatRoom } from '../../types/chat';

vi.setConfig({ testTimeout: 20_000 });
const [MUSA, , ZAINAB] = CHILDREN;

/** A room as the chat store hands it over. */
function room(overrides: Partial<ChatRoom>): ChatRoom {
  return {
    id: 'r1',
    roomId: 'r1',
    displayName: 'Mr Saint Agbukor',
    profilePic: null,
    otherParticipant: null,
    otherParticipantId: 'u1',
    isOnline: false,
    role: 'teacher',
    participantCount: 2,
    isGroup: false,
    canLeave: false,
    avatarInfo: { type: 'initials', value: 'SA', bgColor: '#123' },
    unreadCount: 0,
    lastMessage: null,
    ...overrides,
  } as ChatRoom;
}

let rooms: ChatRoom[] = [];
const refreshChatRooms = vi.fn();
const selectRoom = vi.fn();

vi.mock('../../hooks/useRealtimeChat', () => ({
  useRealtimeChat: () => {
    return {
      chatRooms: rooms,
      messages: [],
      selectedRoom: null,
      selectedRoomId: null,
      thread: { messages: [], historyLoaded: true, hasMore: false, nextCursor: null, status: 'ready', error: null, loadingOlder: false, olderError: null },
      isLoading: false,
      isLoadingMessages: false,
      isConnected: true,
      connectionStatus: 'connected',
      error: null,
      selectRoom,
      retryJoin: vi.fn(),
      loadOlderMessages: vi.fn(),
      sendMessage: vi.fn(),
      deleteStoredMessage: vi.fn(),
      retryMessage: vi.fn(),
      discardMessage: vi.fn(),
      refreshChatRooms,
      leaveGroup: vi.fn(),
      currentUserId: 'p1',
    };
  },
}));

const { default: Messages } = await import('../Messages');


beforeEach(() => {
  rooms = [];
  vi.clearAllMocks();
});

describe('Messages (fixtures)', () => {
  it("lists the active child's class teacher, teachers and the office to start a thread", async () => {
    const { fixtures } = renderPortal(<Messages />, { path: '/messages' });
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument();
    expect(await screen.findByText("Talk to Musa's teachers and the school office.")).toBeInTheDocument();
    const start = await screen.findByRole('region', { name: /Start a conversation about Musa/ });
    await within(start).findByRole('group', { name: 'Class teacher' });
    expect(within(within(start).getByRole('group', { name: 'Class teacher' })).getByText('Mr Saint Agbukor')).toBeInTheDocument();
    expect(within(within(start).getByRole('group', { name: 'Teachers' })).getAllByRole('button')).toHaveLength(4);
    expect(within(within(start).getByRole('group', { name: 'School office' })).getByRole('button', { name: /School office · Easy Sparks/ })).toBeInTheDocument();
    const contacts = requestsTo(fixtures, '/chat/contacts');
    expect(contacts[0].query).toBe(`?childId=${MUSA.id}`);
    expect(contacts[0].headers[CHILD_HEADER]).toBe(MUSA.id);
  });

  it("uses the selected child's school: another child, other teachers", async () => {
    renderPortal(<Messages />, { path: '/messages', childId: ZAINAB.id });
    const start = await screen.findByRole('region', { name: /Start a conversation about Zainab/ });
    expect((await within(start).findAllByText('Dr Kemi Ogunbiyi')).length).toBeGreaterThan(0);
    expect(within(start).queryByText('Mr Saint Agbukor')).not.toBeInTheDocument();
  });

  it('opens a thread with a teacher (one-to-one) and with the office (POST /chat/office), both for the child', async () => {
    const user = userEvent.setup();
    const { fixtures, location } = renderPortal(<Messages />, { path: '/messages' });
    const start = await screen.findByRole('region', { name: /Start a conversation/ });
    await user.click(await within(start).findByRole('button', { name: /Mr Saint Agbukor/ }));
    await waitFor(() => expect(location()).toBe('/messages?room=room-dm-us-sparks-ct'));
    const dm = requestsTo(fixtures, '/chat/rooms')[0];
    // Both people, the parent first: the API refuses a one-person direct message.
    expect(dm.body).toEqual({ type: 'one_to_one', participants: [PARENT.id, 'us-sparks-ct'] });
    expect(dm.headers[CHILD_HEADER]).toBe(MUSA.id);

    await user.click(within(start).getByRole('button', { name: /School office/ }));
    await waitFor(() => expect(location()).toBe('/messages?room=room-office-sparks'));
    expect(requestsTo(fixtures, '/chat/office')[0].headers[CHILD_HEADER]).toBe(MUSA.id);
    expect(refreshChatRooms).toHaveBeenCalled();
  });

  it('opens the office thread straight away from "Message the bursary" (?to=office)', async () => {
    const { location } = renderPortal(<Messages />, { path: '/messages', route: '/messages?to=office' });
    await waitFor(() => expect(location()).toBe('/messages?room=room-office-sparks'));
  });

  it('shows the rooms the parent already has', async () => {
    rooms = [room({ displayName: 'Mrs Abike Dabiri', lastMessage: { preview: 'See you Monday' } as ChatRoom['lastMessage'] })];
    renderPortal(<Messages />, { path: '/messages' });
    expect(await screen.findByText('Mrs Abike Dabiri')).toBeInTheDocument();
    expect(screen.getByText('See you Monday')).toBeInTheDocument();
  });
});
