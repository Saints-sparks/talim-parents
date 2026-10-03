import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatHeader from '../Components/ChatHeader';
import ConversationDetails from '../Components/ConversationDetails';
import MessageInput from '../Components/MessageInput';
import MessageList from '../Components/MessageList';
import MessagesSidebar from '../Components/MessagesSidebar';
import { ReplyBar, addToSelection, type ReplyDraft } from '../Components/chat-kit';
import { toast } from '../Components/CustomToast';
import { useChatAlerts } from '../contexts/ChatAlertsContext';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { getErrorMessage } from '../lib/apiError';
import { useActiveChild } from '../hooks/useActiveChild';
import { useChatContacts, useOpenThread } from '../hooks/portal/useMessagesData';
import { openedRoomId } from '../services/portal/messages';
import { StartConversation } from '../Components/portal/messages/StartConversation';
import { PageHeader } from '../Components/portal/ui/primitives';
import { firstNameOf } from '../lib/format';
import type { ChatDraft, ChatRoom } from '../types/chat';
import type { ChatContact } from '../types/portal/messages';

const EMPTY_DRAFT: ChatDraft = { text: '', files: [], errors: [] };

/**
 * Takes ?room= off the URL if it still points at `roomId`, which closes the room.
 *
 * @param roomId - The room being closed, or nothing to close whichever is open.
 * @returns A search-params updater.
 */
const withoutRoom = (roomId?: string) => (params: URLSearchParams) => {
  if (roomId && params.get('room') !== roomId) return params;
  const next = new URLSearchParams(params);
  next.delete('room');
  return next;
};

/**
 * The parent's inbox: the conversation list with the active child's teachers
 * and the school office to start a thread with (B10), the open thread and its
 * composer, and the details panel. The URL (`?room=<id>`) decides which room
 * is open, so links from toasts, pushes and reloads land in the right chat;
 * `?to=office` opens the office thread of the child's school ("Payment not
 * showing?"). Call is a `tel:` link, shown only when the API gives a phone;
 * there are no in-app calls or video.
 *
 * @returns The page.
 */
function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomParam = searchParams.get('room');

  // Removed by someone else: the store already dropped the room, so go back to the list
  // (ChatAlertsContext shows the "You were removed" toast on every page).
  const handleRoomRemoved = useCallback(
    ({ roomId }: { roomId: string }) => {
      setSearchParams(withoutRoom(roomId), { replace: true });
    },
    [setSearchParams],
  );

  const {
    chatRooms,
    messages,
    selectedRoom,
    selectedRoomId,
    thread,
    isLoading,
    isLoadingMessages,
    isConnected,
    connectionStatus,
    error,
    selectRoom,
    retryJoin,
    loadOlderMessages,
    sendMessage,
    deleteStoredMessage,
    retryMessage,
    discardMessage,
    refreshChatRooms,
    leaveGroup,
    currentUserId,
  } = useRealtimeChat({ onRoomRemoved: handleRoomRemoved });
  const { setOpenRoomId } = useChatAlerts();
  const { child } = useActiveChild();
  const contacts = useChatContacts(child?.id);
  const openThread = useOpenThread(child?.id);
  // The phone each thread opened here can be called on (§27 `callPhone`).
  const [phones, setPhones] = useState<Record<string, string | null>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const officeAsked = useRef(false);

  // Composer state belongs to a room, so nothing typed or attached for one chat is sent to another.
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({});
  // The message being replied to, per room, so a reply never follows you into another chat.
  const [replies, setReplies] = useState<Record<string, ReplyDraft | null>>({});
  const [showDetails, setShowDetails] = useState(false);

  // The URL decides which room is open, so /messages?room=<id> works from toasts, pushes and reloads.
  useEffect(() => {
    selectRoom(roomParam);
  }, [roomParam, selectRoom]);

  useEffect(() => {
    setShowDetails(false);
  }, [roomParam]);

  useEffect(() => {
    setOpenRoomId(selectedRoomId);
    return () => setOpenRoomId(null);
  }, [selectedRoomId, setOpenRoomId]);

  const openRoom = (roomId: string) => {
    if (roomId === roomParam) return;
    setSearchParams({ room: roomId }, { replace: Boolean(roomParam) });
  };

  // Back to the list (phones): the room is closed and left, so nothing is marked read behind the list.
  const closeRoom = () => setSearchParams({}, { replace: true });

  /**
   * Opens (creating on first use) the thread with a teacher or the office,
   * then shows it.
   *
   * @param contact - Who to write to.
   */
  const startThread = useCallback(
    (contact: ChatContact) => {
      setOpening(contact.userId);
      openThread.mutate(contact, {
        onSuccess: (room) => {
          const roomId = openedRoomId(room);
          setPhones((current) => ({ ...current, [roomId]: room.callPhone ?? contact.phone ?? null }));
          refreshChatRooms();
          if (roomId) setSearchParams({ room: roomId });
        },
        onSettled: () => setOpening(null),
      });
    },
    [openThread, refreshChatRooms, setSearchParams],
  );

  // "Message the bursary" and the no-class state link here with ?to=office.
  useEffect(() => {
    if (searchParams.get('to') !== 'office' || officeAsked.current || !contacts.data) return;
    const office = contacts.data.find((contact) => contact.group === 'office');
    if (!office) return;
    officeAsked.current = true;
    startThread(office);
  }, [searchParams, contacts.data, startThread]);

  const draft = (selectedRoomId && drafts[selectedRoomId]) || EMPTY_DRAFT;
  const reply = (selectedRoomId && replies[selectedRoomId]) || null;
  const setReply = (roomId: string, next: ReplyDraft | null) => setReplies((current) => ({ ...current, [roomId]: next }));

  const updateDraft = (roomId: string, changes: Partial<ChatDraft>) =>
    setDrafts((current) => ({ ...current, [roomId]: { ...(current[roomId] || EMPTY_DRAFT), ...changes } }));

  const handleSend = () => {
    const roomId = selectedRoomId;
    if (!roomId || (!draft.text.trim() && !draft.files.length)) return;
    // The pending bubble now holds the text and files; a failed send is retried from the bubble.
    if (sendMessage({ roomId, text: draft.text, files: draft.files, replyTo: reply || undefined })) {
      setDrafts((current) => ({ ...current, [roomId]: EMPTY_DRAFT }));
      setReply(roomId, null);
    }
  };

  /**
   * Adds picked files to a room's draft; unsupported, oversized and over-limit files come back as errors.
   *
   * @param roomId - The room whose draft gets the files.
   * @param picked - The files the parent picked.
   * @returns Nothing; the draft is updated.
   */
  const addFiles = (roomId: string, picked: File[]) =>
    setDrafts((current) => {
      const previous = current[roomId] || EMPTY_DRAFT;
      const { files, errors } = addToSelection(previous.files, picked);
      return { ...current, [roomId]: { ...previous, files, errors } };
    });

  const removeFile = (roomId: string, index: number) =>
    setDrafts((current) => {
      const previous = current[roomId] || EMPTY_DRAFT;
      return { ...current, [roomId]: { ...previous, files: previous.files.filter((_, i) => i !== index) } };
    });

  const handleLeaveGroup = async (room: ChatRoom) => {
    try {
      await leaveGroup(room.roomId);
      setShowDetails(false);
      setSearchParams(withoutRoom(room.roomId), { replace: true });
      toast.success(`You left ${room.displayName || 'the group'}`);
    } catch (leaveError) {
      toast.error(getErrorMessage(leaveError, "Couldn't leave the group"));
    }
  };

  const showConnectionBanner = !isConnected && connectionStatus !== 'connecting';
  const firstName = firstNameOf(child?.name);
  const callPhone = selectedRoomId ? (selectedRoom?.callPhone ?? phones[selectedRoomId] ?? null) : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Messages"
        subtitle={firstName ? `Talk to ${firstName}'s teachers and the school office.` : 'Talk to the teachers and the school office.'}
      />
    <div className="relative flex h-[calc(100dvh-230px)] min-h-[560px] gap-3.5 max-md:h-[calc(100dvh-180px)]">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-screen overflow-hidden bg-tl-surface transition-transform duration-300 md:static md:w-[300px] md:shrink-0 md:translate-x-0 md:rounded-[22px] md:border md:border-tl-line ${
          selectedRoomId ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <MessagesSidebar
          rooms={chatRooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={openRoom}
          isLoading={isLoading}
          isConnected={isConnected}
          error={error}
          onRetry={refreshChatRooms}
          extra={
            child ? (
              <StartConversation
                firstName={firstName}
                contacts={contacts.data}
                isPending={contacts.isPending}
                error={contacts.error}
                opening={opening}
                openError={openThread.error}
                onOpen={startThread}
              />
            ) : null
          }
        />
      </div>

      <section aria-label="Conversation" className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-tl-line bg-tl-surface">
        {selectedRoomId ? (
          <>
            <ChatHeader
              selectedChat={selectedRoom || { displayName: 'Conversation', avatarInfo: null }}
              onBack={closeRoom}
              onToggleDetails={() => setShowDetails((value) => !value)}
              callPhone={callPhone}
            />
            {showConnectionBanner && (
              <div role="status" className="shrink-0 border-b border-tl-line-soft bg-tl-warning-bg px-4 py-2 text-center text-xs font-semibold text-tl-warning">
                {connectionStatus === 'unauthenticated'
                  ? 'Your session has expired. Sign in again to keep chatting.'
                  : "You're offline. Messages you send will go out when you reconnect."}
              </div>
            )}
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <MessageList
                  key={selectedRoomId}
                  messages={messages}
                  isLoading={isLoadingMessages}
                  error={thread.status === 'error' ? thread.error : null}
                  onRetry={retryJoin}
                  hasMore={thread.hasMore}
                  loadingOlder={thread.loadingOlder}
                  olderError={thread.olderError}
                  onLoadOlder={loadOlderMessages}
                  onRetryMessage={retryMessage}
                  onDiscardMessage={discardMessage}
                  onReply={(next) => setReply(selectedRoomId, next)}
                  onDeleteMessage={(messageId) => deleteStoredMessage(selectedRoomId, messageId)}
                  isGroup={Boolean(selectedRoom?.isGroup)}
                  otherUserId={selectedRoom?.otherParticipantId || ''}
                  currentUserId={currentUserId || ''}
                />
                {reply && (
                  <ReplyBar reply={reply} onCancel={() => setReply(selectedRoomId, null)} className="mx-3 mb-1" />
                )}
                {/* Keyed by room: switching chats unmounts the composer, which throws away a recording in progress. */}
                <MessageInput
                  key={selectedRoomId}
                  text={draft.text}
                  onTextChange={(text) => updateDraft(selectedRoomId, { text })}
                  files={draft.files}
                  errors={draft.errors}
                  onAddFiles={(picked) => addFiles(selectedRoomId, picked)}
                  onRemoveFile={(index) => removeFile(selectedRoomId, index)}
                  onDismissErrors={() => updateDraft(selectedRoomId, { errors: [] })}
                  onSend={handleSend}
                  onSendVoice={({ file, duration }) => {
                    if (sendMessage({ roomId: selectedRoomId, files: [file], voice: true, duration, replyTo: reply || undefined })) {
                      setReply(selectedRoomId, null);
                    }
                  }}
                />
              </div>
              {showDetails && selectedRoom && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 bg-black/30 xl:hidden"
                    onClick={() => setShowDetails(false)}
                    aria-label="Close conversation details overlay"
                  />
                  <div className="fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[360px] shadow-2xl xl:static xl:z-auto xl:w-[360px] xl:shadow-none">
                    <ConversationDetails
                      room={selectedRoom}
                      messages={messages}
                      currentUserId={currentUserId}
                      onClose={() => setShowDetails(false)}
                      onLeave={handleLeaveGroup}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-tl-subtle p-6 text-center">
            <div>
              <h2 className="text-lg font-extrabold text-tl-ink">Select a conversation</h2>
              <p className="mt-2 text-sm text-tl-muted">
                {error || 'Pick a conversation, or start one with a teacher or the school office.'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
    </div>
  );
}

export default Messages;
