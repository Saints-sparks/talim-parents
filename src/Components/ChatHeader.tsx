import { ArrowLeft, MoreVertical } from 'lucide-react';
import { formatRoleLabel } from '../lib/chatMessages';
import type { AvatarInfo, ChatRoom } from '../types/chat';
import RoomAvatar from './RoomAvatar';

/** Props for {@link ChatHeader}. */
interface ChatHeaderProps {
  /** The open room; a stand-in while it is still loading. */
  selectedChat: Omit<Partial<ChatRoom>, 'avatarInfo'> & { displayName: string; avatarInfo: AvatarInfo | null };
  /** Back to the conversation list (phones). */
  onBack: () => void;
  onToggleDetails: () => void;
}

/**
 * The open conversation's title bar: who it is, their status, and the button
 * that opens the details panel.
 *
 * @param props - Component props.
 * @returns The header.
 */
function ChatHeader({ selectedChat, onBack, onToggleDetails }: ChatHeaderProps) {
  if (!selectedChat) return null;

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[#E5EAF2] bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-[#667085] hover:bg-[#F2F4F7] md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <RoomAvatar info={selectedChat.avatarInfo} />
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[#101828] dark:text-slate-100">{selectedChat.displayName}</h3>
          <p className="text-sm text-[#667085] dark:text-slate-400">
            {selectedChat.isGroup
              ? `${selectedChat.participantCount || 0} members`
              : selectedChat.isOnline
                ? 'Online'
                : formatRoleLabel(selectedChat.role) || 'Conversation'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleDetails}
          className="rounded-lg border border-[#E5EAF2] p-2 text-[#344054] dark:border-slate-700 dark:text-slate-300"
          aria-label={selectedChat.isGroup ? 'Group info' : 'Conversation details'}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
