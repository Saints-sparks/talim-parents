import { Ban, Check, CheckCheck, Clock } from 'lucide-react';
import MessageAttachment from './MessageAttachment';
import { Linkified, MessageMenu, QuotedMessage, type ReplyDraft } from './chat-kit';
import { toast } from './CustomToast';
import { generateColorFromString, getUserInitials } from '../lib/colorUtils';
import { formatMessageTime, type Receipt } from '../lib/chatMessages';
import type { ChatMessage } from '../types/chat';

/**
 * Own-message delivery: clock while sending, one tick once stored, two accent ticks once read (1:1).
 *
 * @param props - Component props.
 * @param props.state - The receipt state.
 * @returns The icon.
 */
const ReceiptIcon = ({ state }: { state: Receipt['state'] }) => {
  if (state === 'pending') return <Clock className="h-3.5 w-3.5" aria-label="Sending" />;
  if (state === 'read') return <CheckCheck className="h-3.5 w-3.5 text-[#0A4EA3] dark:text-blue-300" aria-label="Read" />;
  return <Check className="h-3.5 w-3.5" aria-label="Sent" />;
};

/** Props for {@link MessageItem}. */
interface MessageItemProps {
  msg: ChatMessage;
  /** From `receiptOf`, own messages only. */
  receipt: Receipt | null;
  /** Group chats: "Read by N" under the latest own message. */
  showReadCount: boolean;
  /** Groups label each sender; a direct chat only has one other person. */
  showSenderName?: boolean;
  /** Start a reply to this message. */
  onReply?: (reply: ReplyDraft) => void;
  /** Present when this user may delete this message. */
  onDeleteMessage?: () => Promise<void>;
  /** Scroll to a quoted message; omitted when it isn't loaded. */
  onJump?: (messageId: string) => void;
  onRetry?: (message: ChatMessage) => void;
  onDiscard?: (message: ChatMessage) => void;
}

/**
 * One message bubble: sender, attachments, text, time and delivery state, with
 * Retry / Delete on a message that failed to send.
 *
 * @param props - Component props.
 * @returns The bubble row.
 */
function MessageItem({
  msg,
  receipt,
  showReadCount,
  showSenderName = true,
  onReply,
  onDeleteMessage,
  onJump,
  onRetry,
  onDiscard,
}: MessageItemProps) {
  const isUserMessage = Boolean(msg.isOwn);
  const senderName = msg.senderName || 'Unknown';
  const bgColor = generateColorFromString(senderName);
  const isPending = msg.status === 'pending';
  const isFailed = msg.status === 'failed';
  const tone = isUserMessage ? 'inverted' : 'default';
  const canShowMenu = Boolean(msg._id) && !isPending && !isFailed && !msg.isDeleted;

  return (
    <div className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUserMessage && (
        <div
          className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: bgColor }}
        >
          {getUserInitials(senderName)}
        </div>
      )}

      <div className={`max-w-[82%] sm:max-w-[560px] ${isUserMessage ? 'items-end' : 'items-start'}`}>
        {!isUserMessage && showSenderName && (
          <p className="mb-1 text-xs font-semibold text-[#667085] dark:text-slate-400">{senderName}</p>
        )}
        <div
          className={`group relative space-y-2 rounded-2xl px-4 py-3 shadow-sm ${
            isUserMessage
              ? `rounded-br-md bg-[#0A4EA3] text-white ${isPending ? 'opacity-70' : ''} ${isFailed ? 'ring-2 ring-red-400' : ''}`
              : 'rounded-bl-md border border-[#E5EAF2] bg-white text-[#101828] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
          }`}
        >
          {canShowMenu && (
            <MessageMenu
              messageId={msg._id as string}
              text={msg.text}
              attachments={msg.attachments}
              onReply={
                onReply
                  ? () =>
                      onReply({
                        messageId: msg._id as string,
                        senderName,
                        preview: msg.text || (msg.attachments?.length ? 'Attachment' : ''),
                      })
                  : undefined
              }
              onDelete={onDeleteMessage}
              onNotify={(text) => (/copied/i.test(text) ? toast.success(text) : toast.error(text))}
              tone={tone}
              className="absolute right-1 top-1 z-10"
            />
          )}
          {msg.isDeleted ? (
            <p className="flex items-center gap-1.5 text-sm italic opacity-80">
              <Ban className="h-3.5 w-3.5" aria-hidden /> This message was deleted
            </p>
          ) : (
            <>
              {msg.replyTo ? <QuotedMessage replyTo={msg.replyTo} tone={tone} onJump={onJump} /> : null}
              <MessageAttachment message={msg} isUserMessage={isUserMessage} />
              {msg.text ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  <Linkified text={msg.text} tone={tone} />
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className={`mt-1 text-xs ${isUserMessage ? 'text-right' : 'text-left'}`}>
          {isFailed ? (
            <span className="text-red-600 dark:text-red-400" title={msg.error || undefined}>
              Not sent ·{' '}
              <button type="button" onClick={() => onRetry?.(msg)} className="font-semibold underline">
                Retry
              </button>{' '}
              ·{' '}
              <button type="button" onClick={() => onDiscard?.(msg)} className="font-semibold underline">
                Delete
              </button>
            </span>
          ) : receipt ? (
            <span className="inline-flex items-center gap-1 text-[#98A2B3]">
              {formatMessageTime(msg.createdAt)}
              <ReceiptIcon state={receipt.state} />
              {showReadCount && receipt.readCount > 0 ? <span>· Read by {receipt.readCount}</span> : null}
            </span>
          ) : (
            <span className="text-[#98A2B3]">{formatMessageTime(msg.createdAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageItem;
