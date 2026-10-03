import { ArrowLeft, Info, Phone } from 'lucide-react';
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
  /** The number to call from this thread (§27 `callPhone`), when the API has one. */
  callPhone?: string | null;
}

/**
 * The open conversation's title bar: who it is, their role or status, Call
 * (a `tel:` link, only when the API gives a phone: there are no in-app calls
 * or video), and the button that opens the conversation info.
 *
 * @param props - Component props.
 * @param props.selectedChat - The open room.
 * @param props.onBack - Back to the list on phones.
 * @param props.onToggleDetails - Opens or closes the info panel.
 * @param props.callPhone - The phone to call, if any.
 * @returns The header.
 */
function ChatHeader({ selectedChat, onBack, onToggleDetails, callPhone }: ChatHeaderProps) {
  if (!selectedChat) return null;

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-tl-line-soft bg-tl-surface px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-tl-muted hover:bg-tl-bg md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <RoomAvatar info={selectedChat.avatarInfo} />
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold text-tl-ink">{selectedChat.displayName}</h3>
          <p className="text-[13px] text-tl-muted">
            {selectedChat.subtitle ||
              (selectedChat.isGroup
                ? `${selectedChat.participantCount || 0} members`
                : selectedChat.isOnline
                  ? 'Online'
                  : formatRoleLabel(selectedChat.role) || 'Conversation')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {callPhone ? (
          <a
            href={`tel:${callPhone.replace(/[^+\d]/g, '')}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-tl-line text-tl-muted hover:bg-tl-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link"
            aria-label={`Call ${selectedChat.displayName} on ${callPhone}`}
            title={`Call ${callPhone}`}
          >
            <Phone className="h-[17px] w-[17px]" aria-hidden="true" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={onToggleDetails}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-tl-line text-tl-muted hover:bg-tl-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link"
          aria-label={selectedChat.isGroup ? 'Group info' : 'Conversation info'}
          title="Conversation info — members, images, documents and links"
        >
          <Info className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
