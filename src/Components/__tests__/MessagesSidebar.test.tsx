import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MessagesSidebar from '../MessagesSidebar';
import MessageItem from '../MessageItem';
import type { ChatMessage, ChatRoom } from '../../types/chat';

/** A room as `toChatRoom` produces it, overridable per test. */
function room(overrides: Partial<ChatRoom> = {}): ChatRoom {
  return {
    id: 'r1',
    roomId: 'r1',
    displayName: 'Mrs Bello',
    profilePic: null,
    otherParticipant: null,
    otherParticipantId: '',
    isOnline: false,
    role: 'teacher',
    participantCount: 2,
    isGroup: false,
    canLeave: false,
    avatarInfo: { type: 'initials', value: 'MB', bgColor: '#123456' },
    unreadCount: 0,
    lastMessage: { preview: 'See you Monday', createdAt: '2026-09-01T10:00:00.000Z' },
    ...overrides,
  };
}

const ROOMS = [
  room(),
  room({ roomId: 'r2', id: 'r2', displayName: 'JSS 1 Parents', isGroup: true, unreadCount: 3, lastMessage: null }),
];

/** Renders the sidebar with sensible defaults. */
function renderSidebar(overrides: Partial<React.ComponentProps<typeof MessagesSidebar>> = {}) {
  const props = {
    rooms: ROOMS,
    selectedRoomId: null,
    onSelectRoom: vi.fn(),
    isLoading: false,
    isConnected: true,
    error: null,
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<MessagesSidebar {...props} />);
  return props;
}

describe('MessagesSidebar', () => {
  it('lists every room with its preview, and an honest placeholder for an empty one', () => {
    renderSidebar();
    expect(screen.getByText('Mrs Bello')).toBeInTheDocument();
    expect(screen.getByText('See you Monday')).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('filters to unread and to groups', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /^unread/i }));
    expect(screen.queryByText('Mrs Bello')).not.toBeInTheDocument();
    expect(screen.getByText('JSS 1 Parents')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Groups' }));
    expect(screen.getByText('JSS 1 Parents')).toBeInTheDocument();
  });

  it('searches by name', () => {
    renderSidebar();
    fireEvent.change(screen.getByLabelText('Search messages'), { target: { value: 'bello' } });
    expect(screen.getByText('Mrs Bello')).toBeInTheDocument();
    expect(screen.queryByText('JSS 1 Parents')).not.toBeInTheDocument();
  });

  it('opens a room by its id', () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByText('Mrs Bello'));
    expect(props.onSelectRoom).toHaveBeenCalledWith('r1');
  });

  it('offers no filter button that does nothing', () => {
    renderSidebar();
    expect(screen.queryByTitle('Filter messages')).not.toBeInTheDocument();
  });

  it('shows a retry, not a skeleton, when the list failed to load', () => {
    const props = renderSidebar({ rooms: [], error: "Couldn't load your conversations" });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalled();
  });
});

describe('MessageItem', () => {
  /** A stored message, overridable per test. */
  function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
      _id: 'm1',
      senderId: 'u1',
      senderName: 'Ada',
      senderAvatar: null,
      isOwn: true,
      text: 'Hello',
      type: 'text',
      attachments: [],
      createdAt: '2026-09-01T10:00:00.000Z',
      readBy: [],
      status: 'sent',
      ...overrides,
    };
  }

  it('offers Retry and Delete on a message that failed to send', () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();
    const failed = message({ _id: undefined, clientMessageId: 'c1', status: 'failed' });
    render(<MessageItem msg={failed} receipt={{ state: 'failed', readCount: 0 }} showReadCount={false} onRetry={onRetry} onDiscard={onDiscard} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onRetry).toHaveBeenCalledWith(failed);
    expect(onDiscard).toHaveBeenCalledWith(failed);
  });

  it('shows the read count under the newest own message in a group', () => {
    render(<MessageItem msg={message()} receipt={{ state: 'sent', readCount: 2 }} showReadCount />);
    expect(screen.getByText(/read by 2/i)).toBeInTheDocument();
  });

  it("shows the sender's name on someone else's message only", () => {
    const { rerender } = render(<MessageItem msg={message({ isOwn: false })} receipt={null} showReadCount={false} />);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    rerender(<MessageItem msg={message({ isOwn: true })} receipt={{ state: 'sent', readCount: 0 }} showReadCount={false} />);
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });
});
