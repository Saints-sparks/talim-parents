import { useCallback, useRef, type MutableRefObject } from 'react';
import { fileKind, messageTypeFor, useAttachmentUpload, type UploadItem } from '../../Components/chat-kit';
import { createClientMessageId, normalizeMessage } from '../../lib/chatMessages';
import { uploadChatAttachment } from '../../services/chat.services';
import type { ChatMessage, MessageStatus, SendMessageInput, Thread } from '../../types/chat';
import { ackErrorCode, type WebSocketApi } from '../useWebSocket';
import {
  buildPendingMessage,
  createPreviewUrl,
  describeSendFailure,
  revokePreviews,
  type OutboxEntry,
} from './outbox';
import { withUploadProgress, withoutUnsentMessage } from './threadStore';

/** What the outbox needs from the chat store. */
export interface UseChatOutboxParams {
  webSocket: WebSocketApi | null;
  currentUserId: string | undefined;
  /** For the sender name on the pending bubble. */
  firstName: string | undefined;
  lastName: string | undefined;
  /** The open room, the default target of `sendMessage`. */
  selectedRoomIdRef: MutableRefObject<string | null>;
  updateThread: (roomId: string, updater: (thread: Thread) => Thread) => void;
  mergeIntoThread: (roomId: string, messages: ChatMessage[]) => void;
  setMessageStatus: (roomId: string, clientMessageId: string, status: MessageStatus, error?: string | null) => void;
}

/** What `useChatOutbox` returns. */
export interface UseChatOutboxResult {
  /** clientMessageId to the unsent message's send state. */
  outboxRef: MutableRefObject<Map<string, OutboxEntry>>;
  /** Drops an outbox entry and frees its local previews. */
  releaseOutboxEntry: (clientMessageId: string) => void;
  /** Uploads what is left of a message's files and sends it. Resolves once it was sent or failed. */
  deliver: (clientMessageId: string) => Promise<void>;
  /**
   * Sends optimistically: the bubble appears at once with the text and local
   * previews of the files, so a failed send never loses them. Files upload
   * (two at a time, with progress) before the message is sent; retries reuse
   * the same clientMessageId and only upload files that didn't make it.
   * Returns false when there was nothing to send.
   */
  sendMessage: (message: SendMessageInput) => boolean;
  /** Sends a failed message again. */
  retryMessage: (message: ChatMessage | null | undefined) => void;
  /** Deletes an unsent message (not while it is sending). */
  discardMessage: (message: ChatMessage | null | undefined) => void;
}

/**
 * The chat store's send pipeline: the outbox of unsent messages, file uploads
 * with progress, delivery over the socket, retry and discard.
 *
 * @param params - The socket, the current user and the thread setters of the store.
 * @returns The outbox and its actions.
 */
export const useChatOutbox = ({
  webSocket,
  currentUserId,
  firstName,
  lastName,
  selectedRoomIdRef,
  updateThread,
  mergeIntoThread,
  setMessageStatus,
}: UseChatOutboxParams): UseChatOutboxResult => {
  // clientMessageId -> the message's roomId, text, files, previews, upload progress and send state.
  const outboxRef = useRef<Map<string, OutboxEntry>>(new Map());
  const { upload } = useAttachmentUpload(uploadChatAttachment);

  const releaseOutboxEntry = useCallback((clientMessageId: string) => {
    const entry = outboxRef.current.get(clientMessageId);
    if (!entry) return;
    outboxRef.current.delete(clientMessageId);
    revokePreviews(entry);
  }, []);

  /** Upload progress of one file in a pending bubble, in 5% steps so the list doesn't re-render per byte. */
  const reportUploadProgress = useCallback(
    (clientMessageId: string, index: number, fraction: number) => {
      const entry = outboxRef.current.get(clientMessageId);
      if (!entry) return;
      const step = Math.round(fraction * 20);
      if (entry.progressSteps[index] === step) return;
      entry.progressSteps[index] = step;
      updateThread(entry.roomId, (thread) => withUploadProgress(thread, clientMessageId, index, step / 20));
    },
    [updateThread],
  );

  const deliver = useCallback(
    async (clientMessageId: string) => {
      const entry = outboxRef.current.get(clientMessageId);
      if (!entry || entry.inFlight || !webSocket) return;
      entry.inFlight = true;

      try {
        // Files already uploaded on an earlier attempt are skipped.
        const attachments = entry.items.length
          ? await upload(entry.items, {
              onProgress: (index, fraction) => reportUploadProgress(clientMessageId, index, fraction),
            })
          : [];

        const payload = {
          roomId: entry.roomId,
          text: entry.text,
          type: entry.type,
          clientMessageId,
          ...(attachments.length ? { attachments } : {}),
          ...(entry.replyTo ? { replyToId: entry.replyTo.messageId } : {}),
          ...(entry.voice && entry.duration ? { duration: entry.duration } : {}),
        };

        const ack = await webSocket.sendChatMessage(payload);
        releaseOutboxEntry(clientMessageId);
        if (ack?.message) {
          mergeIntoThread(entry.roomId, [normalizeMessage(ack.message, currentUserId, entry.roomId)]);
        }
      } catch (error) {
        entry.inFlight = false;
        // Typed offline: stays pending and is sent on reconnect.
        if (ackErrorCode(error) === 'OFFLINE' || !outboxRef.current.has(clientMessageId)) return;
        entry.failed = true;
        setMessageStatus(entry.roomId, clientMessageId, 'failed', describeSendFailure(error, entry));
      }
    },
    [webSocket, currentUserId, upload, reportUploadProgress, releaseOutboxEntry, mergeIntoThread, setMessageStatus],
  );

  const sendMessage = useCallback(
    ({ roomId, text = '', files = [], voice = false, duration, replyTo }: SendMessageInput) => {
      const targetRoomId = roomId || selectedRoomIdRef.current;
      const trimmed = text.trim();
      if (!targetRoomId || (!trimmed && !files.length)) return false;

      const items: UploadItem[] = files.map((file) => (voice ? { file, kind: 'audio', duration } : { file }));
      const kinds = items.map((item) => item.kind || fileKind(item.file));
      const previews = items.map((item, index) => createPreviewUrl(item.file, kinds[index]));
      const type = messageTypeFor(kinds, voice);

      const clientMessageId = createClientMessageId();
      outboxRef.current.set(clientMessageId, {
        roomId: targetRoomId,
        text: trimmed,
        items,
        previews,
        progressSteps: items.map(() => 0),
        type,
        voice,
        duration,
        replyTo,
        inFlight: false,
        failed: false,
      });

      mergeIntoThread(targetRoomId, [
        buildPendingMessage({
          clientMessageId,
          roomId: targetRoomId,
          currentUserId,
          senderName: [firstName, lastName].filter(Boolean).join(' ') || 'You',
          text: trimmed,
          items,
          previews,
          kinds,
          type,
          voice,
          duration,
          replyTo,
        }),
      ]);

      void deliver(clientMessageId);
      return true;
    },
    [currentUserId, firstName, lastName, selectedRoomIdRef, mergeIntoThread, deliver],
  );

  const retryMessage = useCallback(
    (message: ChatMessage | null | undefined) => {
      const clientMessageId = message?.clientMessageId;
      const entry = clientMessageId ? outboxRef.current.get(clientMessageId) : undefined;
      if (!clientMessageId || !entry) return;
      entry.failed = false;
      setMessageStatus(entry.roomId, clientMessageId, 'pending');
      void deliver(clientMessageId);
    },
    [deliver, setMessageStatus],
  );

  const discardMessage = useCallback(
    (message: ChatMessage | null | undefined) => {
      const clientMessageId = message?.clientMessageId;
      const entry = clientMessageId ? outboxRef.current.get(clientMessageId) : undefined;
      if (!clientMessageId || !entry || entry.inFlight) return;
      releaseOutboxEntry(clientMessageId);
      updateThread(entry.roomId, (thread) => withoutUnsentMessage(thread, clientMessageId));
    },
    [updateThread, releaseOutboxEntry],
  );

  return { outboxRef, releaseOutboxEntry, deliver, sendMessage, retryMessage, discardMessage };
};
