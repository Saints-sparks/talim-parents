import { useMemo, useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { Lightbox, VoicePlayer, attachmentKind, type AttachmentKind } from './chat-kit';
import RoomAvatar from './RoomAvatar';
import { formatRoleLabel, toId } from '../lib/chatMessages';
import { generateColorFromString, getUserInitials } from '../lib/colorUtils';
import type { ChatMessage, ChatParticipant, ChatRoom, MessageAttachment } from '../types/chat';

const VOICE_NOTES_SHOWN = 3;
const PHOTOS_SHOWN = 6;

/**
 * Stored attachments of one kind from the loaded messages, newest first
 * (voice notes keep the message's length).
 *
 * @param messages - The open room's loaded messages.
 * @param kind - Which kind of attachment to collect.
 * @returns The attachments, newest first.
 */
const getSharedAttachments = (messages: ChatMessage[], kind: AttachmentKind): MessageAttachment[] =>
  messages
    .filter((message) => message._id)
    .flatMap((message) =>
      (message.attachments || []).map((attachment) =>
        attachment.duration || !message.duration ? attachment : { ...attachment, duration: message.duration },
      ),
    )
    .filter((attachment) => attachment.url && attachmentKind(attachment) === kind)
    .reverse();

const participantIdOf = (participant: ChatParticipant | null | undefined): string =>
  toId(participant?._id) || toId(participant?.userId);

const participantNameOf = (participant: ChatParticipant | null | undefined): string =>
  [participant?.firstName, participant?.lastName].filter(Boolean).join(' ') || participant?.name || 'User';

/**
 * A member's picture, or their initials on a colour derived from their name.
 *
 * @param props - Component props.
 * @param props.src - The picture URL, if any.
 * @param props.name - The member's name, for the initials.
 * @returns The avatar.
 */
function MemberAvatar({ src, name }: { src?: string | null; name: string }) {
  const size = 'h-10 w-10 text-sm';
  if (src) return <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover`} />;
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ backgroundColor: generateColorFromString(name) }}
    >
      {getUserInitials(name)}
    </span>
  );
}

/**
 * The "Leave group?" confirmation.
 *
 * @param props - Component props.
 * @param props.roomName - The group's name.
 * @param props.isLeaving - Disables both buttons while the request runs.
 * @param props.onCancel - Dismisses the dialog.
 * @param props.onConfirm - Leaves the group.
 * @returns The dialog.
 */
function ConfirmLeaveDialog({
  roomName,
  isLeaving,
  onCancel,
  onConfirm,
}: {
  roomName: string | undefined;
  isLeaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-group-title"
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900"
      >
        <h3 id="leave-group-title" className="text-base font-bold text-[#101828] dark:text-slate-100">
          Leave group?
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#667085] dark:text-slate-400">
          You&apos;ll stop receiving messages from {roomName || 'this group'} and it will be removed from your
          conversations.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLeaving}
            className="rounded-lg border border-[#E5EAF2] px-4 py-2 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD] disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLeaving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isLeaving ? 'Leaving…' : 'Leave group'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Props for {@link ConversationDetails}. */
interface ConversationDetailsProps {
  room: ChatRoom;
  messages: ChatMessage[];
  currentUserId: string | undefined;
  onClose: () => void;
  onLeave?: (room: ChatRoom) => Promise<void> | void;
}

/**
 * Details of the open conversation: avatar, name, description (groups) or role
 * (direct messages), members, shared media, and Leave for groups members may leave.
 *
 * @param props - Component props.
 * @returns The details panel.
 */
function ConversationDetails({ room, messages, currentUserId, onClose, onLeave }: ConversationDetailsProps) {
  const images = useMemo(() => getSharedAttachments(messages, 'image'), [messages]);
  const audio = useMemo(() => getSharedAttachments(messages, 'audio'), [messages]);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const members = useMemo(
    () =>
      [...(room?.participants || [])].sort((a, b) => {
        const aIsMe = participantIdOf(a) === currentUserId;
        const bIsMe = participantIdOf(b) === currentUserId;
        if (aIsMe !== bIsMe) return aIsMe ? -1 : 1;
        if (Boolean(a.isOnline) !== Boolean(b.isOnline)) return a.isOnline ? -1 : 1;
        return participantNameOf(a).localeCompare(participantNameOf(b));
      }),
    [room?.participants, currentUserId],
  );

  if (!room) return null;

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await onLeave?.(room);
    } finally {
      setIsLeaving(false);
      setConfirmingLeave(false);
    }
  };

  const directRole = formatRoleLabel(room.otherParticipant?.role);

  return (
    <aside className="flex h-full w-full max-w-[360px] shrink-0 flex-col overflow-y-auto border-l border-[#E5EAF2] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#101828] dark:text-slate-100">
          {room.isGroup ? 'Group info' : 'Conversation Details'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-[#667085] hover:bg-[#F2F4F7] dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Close conversation details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-[#E5EAF2] pb-6 text-center dark:border-slate-800">
        <RoomAvatar info={room.avatarInfo} size="xl" />
        <h4 className="mt-3 break-words text-lg font-bold text-[#101828] dark:text-slate-100">{room.displayName}</h4>
        <p className="text-sm text-[#667085] dark:text-slate-400">
          {room.isGroup
            ? `${room.participantCount} ${room.participantCount === 1 ? 'member' : 'members'}`
            : [directRole, room.isOnline ? 'Online' : null].filter(Boolean).join(' · ') || 'Direct message'}
        </p>
      </div>

      {room.isGroup && (
        <>
          <section className="mt-6 border-b border-[#E5EAF2] pb-6 dark:border-slate-800">
            <h4 className="mb-3 text-sm font-bold text-[#101828] dark:text-slate-100">Description</h4>
            {room.description ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#667085] dark:text-slate-400">
                {room.description}
              </p>
            ) : (
              <p className="text-sm text-[#98A2B3]">No description</p>
            )}
          </section>

          <section className="mt-6 border-b border-[#E5EAF2] pb-6 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#101828] dark:text-slate-100">Members</h4>
              <span className="text-xs font-semibold text-[#0A4EA3] dark:text-blue-300">{members.length}</span>
            </div>
            <ul className="space-y-3">
              {members.map((participant) => {
                const id = participantIdOf(participant);
                const name = participantNameOf(participant);
                const isMe = id === currentUserId;
                return (
                  <li key={id || name} className="flex items-center gap-3">
                    <span className="relative">
                      <MemberAvatar src={participant.userAvatar} name={name} />
                      {participant.isOnline && (
                        <span
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                          aria-label="Online"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#101828] dark:text-slate-100">
                        {name}
                        {isMe && <span className="font-normal text-[#667085] dark:text-slate-400"> (You)</span>}
                      </p>
                      <p className="truncate text-xs text-[#667085] dark:text-slate-400">
                        {[formatRoleLabel(participant.role), participant.isOnline ? 'Online' : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section className="mt-6 border-b border-[#E5EAF2] pb-6 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#101828] dark:text-slate-100">Voice Notes</h4>
          <span className="text-xs font-semibold text-[#0A4EA3] dark:text-blue-300">{audio.length}</span>
        </div>
        <div className="space-y-2">
          {audio.slice(0, VOICE_NOTES_SHOWN).map((item, index) => (
            <VoicePlayer
              key={`${item.url}-${index}`}
              url={item.url}
              playbackUrl={item.playbackUrl}
              duration={item.duration}
            />
          ))}
          {!audio.length && <p className="text-sm text-[#98A2B3]">No voice notes yet.</p>}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#101828] dark:text-slate-100">Shared Photos</h4>
          <span className="text-xs font-semibold text-[#0A4EA3] dark:text-blue-300">{images.length}</span>
        </div>
        {images.length ? (
          <div className="grid grid-cols-3 gap-2">
            {images.slice(0, PHOTOS_SHOWN).map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setPhotoIndex(index)}
                className="relative overflow-hidden rounded-lg"
                aria-label={`Open photo ${index + 1} of ${images.length}`}
              >
                <img src={image.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                {index === PHOTOS_SHOWN - 1 && images.length > PHOTOS_SHOWN && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                    +{images.length - PHOTOS_SHOWN}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#98A2B3]">No shared photos yet.</p>
        )}
        <Lightbox
          images={images.map((image) => ({ url: image.url, name: image.name }))}
          index={photoIndex}
          onClose={() => setPhotoIndex(null)}
          onIndexChange={setPhotoIndex}
        />
      </section>

      {(audio.length > 0 || images.length > 0) && <p className="mt-3 text-xs text-[#98A2B3]">From loaded messages</p>}

      {room.canLeave && onLeave && (
        <button
          type="button"
          onClick={() => setConfirmingLeave(true)}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          Leave group
        </button>
      )}

      {confirmingLeave && (
        <ConfirmLeaveDialog
          roomName={room.displayName}
          isLeaving={isLeaving}
          onCancel={() => setConfirmingLeave(false)}
          onConfirm={handleLeave}
        />
      )}
    </aside>
  );
}

export default ConversationDetails;
