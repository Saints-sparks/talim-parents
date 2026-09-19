import { useMemo, useState } from 'react';
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
}

/**
 * The conversation list: search, All / Unread / Groups filters, and one row
 * per room with its preview, time and unread count.
 *
 * @param props - Component props.
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
    <aside className="flex h-full w-full flex-col border-r border-[#E5EAF2] bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="shrink-0 border-b border-[#E5EAF2] px-4 pb-4 pt-6 dark:border-slate-800">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#101828] dark:text-slate-100">Messages</h2>
            <p className="text-sm text-[#667085] dark:text-slate-400">
              {isConnected ? 'Communicate with teachers and school staff.' : 'Connecting to chat...'}
            </p>
          </div>
          <span className="rounded-full bg-[#EAF2FB] px-2.5 py-1 text-xs font-semibold text-[#0A4EA3] dark:bg-blue-950/60 dark:text-blue-300">
            {totalUnread}
          </span>
        </div>

        <label className="flex min-w-0 items-center gap-2 rounded-lg border border-[#DCE5F2] px-3 py-2 dark:border-slate-700">
          <Search className="h-4 w-4 shrink-0 text-[#98A2B3]" aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search messages..."
            aria-label="Search messages"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none dark:text-slate-100"
          />
        </label>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedFilter(key)}
              aria-pressed={selectedFilter === key}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                selectedFilter === key
                  ? 'border-[#D9E8FF] bg-[#EAF2FB] text-[#0A4EA3] dark:border-blue-500/40 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'border-[#E5EAF2] bg-white text-[#667085] hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl bg-[#F2F4F7] dark:bg-slate-800" />
            ))}
          </div>
        ) : error && !rooms.length ? (
          <div className="px-4 py-12 text-center text-sm text-[#667085] dark:text-slate-400">
            <p>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-[#0A4EA3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083F83]"
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
              className={`mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                selectedRoomId === room.roomId ? 'bg-[#EAF2FB] dark:bg-slate-800' : 'hover:bg-[#F8FAFD] dark:hover:bg-slate-800/60'
              }`}
            >
              <RoomAvatar info={room.avatarInfo} />

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-[#101828] dark:text-slate-100">{room.displayName}</span>
                  <span className="shrink-0 text-xs text-[#667085] dark:text-slate-400">{formatRoomTime(room)}</span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-[#667085] dark:text-slate-400">{getPreview(room)}</span>
                  {room.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0A4EA3] px-1.5 text-xs font-bold text-white">
                      {room.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-4 py-12 text-center text-sm text-[#667085] dark:text-slate-400">No conversations found.</div>
        )}
      </div>
    </aside>
  );
}

export default MessagesSidebar;
