import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import RoomAvatar from './RoomAvatar';
import type { ChatRoom } from '../types/chat';

type RoomFilter = 'all' | 'unread' | 'groups';

/**
 * The time to show beside a room: a clock time today, otherwise the date.
 *
 * @param room - The room.
 * @returns The formatted time, or an empty string when the room has no activity.
 */
const formatRoomTime = (room: ChatRoom): string => {
  const value = room?.lastMessage?.createdAt || room?.updatedAt;
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

/**
 * The line under a room's name: the last message's text, or what kind of
 * attachment it was.
 *
 * @param room - The room.
 * @returns The preview.
 */
const getPreview = (room: ChatRoom): string => {
  const lastMessage = room?.lastMessage;
  if (!lastMessage) return 'No messages yet';
  if (lastMessage.preview) return lastMessage.preview;
  if (lastMessage.content) return lastMessage.content;
  const attachment = lastMessage.attachments?.[0];
  if (!attachment) return 'Attachment';
  const type = typeof attachment === 'string' ? 'file' : (attachment as { type?: string }).type;
  if (type === 'image') return 'Photo';
  if (type === 'audio') return 'Voice message';
  return 'Attachment';
};

/** Props for {@link MessagesSidebar}. */
interface MessagesSidebarProps {
  rooms?: ChatRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  onRetry: () => void;
  /** Shown under the rooms (the child's teachers and the office, to start a thread). */
  extra?: ReactNode;
}

/**
 * The conversation list: search, All / Unread / Groups filters, and one row
 * per room with its preview, time and unread count, in the redesign's tokens.
 *
 * @param props - Component props.
 * @param props.rooms - The rooms.
 * @param props.selectedRoomId - The open room.
 * @param props.onSelectRoom - Opens a room.
 * @param props.isLoading - While the list loads.
 * @param props.isConnected - Whether the socket is up.
 * @param props.error - Why the list could not load.
 * @param props.onRetry - Loads the list again.
 * @param props.extra - Content under the rooms.
 * @returns The sidebar.
 */
function MessagesSidebar({
  rooms = [],
  selectedRoomId,
  onSelectRoom,
  isLoading,
  isConnected,
  error,
  onRetry,
  extra,
}: MessagesSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<RoomFilter>('all');

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesFilter =
        selectedFilter === 'all' ||
        (selectedFilter === 'unread' && room.unreadCount > 0) ||
        (selectedFilter === 'groups' && room.isGroup);
      const matchesSearch =
        !term || room.displayName?.toLowerCase().includes(term) || getPreview(room).toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [rooms, searchTerm, selectedFilter]);

  const totalUnread = rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
  const filters: Array<[RoomFilter, string]> = [
    ['all', 'All'],
    ['unread', `Unread${totalUnread ? ` ${totalUnread}` : ''}`],
    ['groups', 'Groups'],
  ];

  return (
    <aside className="flex h-full w-full flex-col bg-tl-surface" aria-label="Conversations">
      <div className="shrink-0 border-b border-tl-line-soft px-[18px] pb-4 pt-[18px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint">Conversations</h2>
          <span className="text-xs text-tl-faint">{isConnected ? (totalUnread ? `${totalUnread} unread` : '') : 'Connecting…'}</span>
        </div>

        <label className="flex min-h-[44px] min-w-0 items-center gap-2 rounded-[13px] border border-tl-control px-3 focus-within:ring-2 focus-within:ring-tl-link">
          <Search className="h-4 w-4 shrink-0 text-tl-faint" aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search messages"
            aria-label="Search messages"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-tl-ink outline-none placeholder:text-tl-faint"
          />
        </label>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedFilter(key)}
              aria-pressed={selectedFilter === key}
              className={`min-h-[44px] rounded-xl border px-2 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link ${
                selectedFilter === key ? 'border-tl-brand-fill bg-tl-brand-fill text-tl-on-brand' : 'border-tl-line bg-tl-surface text-tl-muted hover:text-tl-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading conversations">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-xl bg-tl-track" />
            ))}
          </div>
        ) : error && !rooms.length ? (
          <div className="px-4 py-8 text-center text-sm text-tl-muted">
            <p>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 min-h-[44px] rounded-[14px] bg-tl-brand-fill px-4 py-2 text-sm font-bold text-tl-on-brand hover:bg-tl-brand-fill-hover"
            >
              Retry
            </button>
          </div>
        ) : filteredRooms.length ? (
          filteredRooms.map((room) => (
            <button
              key={room.roomId}
              type="button"
              onClick={() => onSelectRoom(room.roomId)}
              aria-current={selectedRoomId === room.roomId ? 'true' : undefined}
              className={`mb-1 flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link ${
                selectedRoomId === room.roomId ? 'bg-tl-select' : 'hover:bg-tl-subtle'
              }`}
            >
              <RoomAvatar info={room.avatarInfo} />

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-bold text-tl-ink">{room.displayName}</span>
                  <span className={`shrink-0 text-xs ${selectedRoomId === room.roomId ? 'text-tl-muted' : 'text-tl-faint'}`}>{formatRoomTime(room)}</span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] text-tl-muted">{getPreview(room)}</span>
                  {room.unreadCount > 0 && (
                    <span className="inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-[9px] bg-tl-badge px-[7px] py-px text-xs font-extrabold text-white" aria-label={`${room.unreadCount} unread`}>
                      {room.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-sm text-tl-muted">No conversations yet.</div>
        )}
        {extra}
      </div>
    </aside>
  );
}

export default MessagesSidebar;
