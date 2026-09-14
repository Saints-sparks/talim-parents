import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChatHeader from "../Components/ChatHeader";
import ConversationDetails from "../Components/ConversationDetails";
import MessageInput from "../Components/MessageInput";
import MessageList from "../Components/MessageList";
import MessagesSidebar from "../Components/MessagesSidebar";
import { toast } from "../Components/CustomToast";
import { useChatAlerts } from "../contexts/ChatAlertsContext";
import { useRealtimeChat } from "../hooks/useRealtimeChat";

const EMPTY_DRAFT = { text: "", file: null };

const releaseStream = (stream) => stream?.getTracks().forEach((track) => track.stop());

/** Takes ?room= off the URL if it still points at `roomId`, which closes the room. */
const withoutRoom = (roomId) => (params) => {
  if (roomId && params.get("room") !== roomId) return params;
  const next = new URLSearchParams(params);
  next.delete("room");
  return next;
};

function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomParam = searchParams.get("room");

  // Removed by someone else: the store already dropped the room; tell the user and go back to the list.
  const handleRoomRemoved = useCallback(
    ({ roomId, name }) => {
      toast.info(name ? `You were removed from ${name}` : "You were removed from a group");
      setSearchParams(withoutRoom(roomId), { replace: true });
    },
    [setSearchParams]
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
    retryMessage,
    discardMessage,
    refreshChatRooms,
    leaveGroup,
    currentUserId,
  } = useRealtimeChat({ onRoomRemoved: handleRoomRemoved });
  const { setOpenRoomId } = useChatAlerts();

  // Composer state belongs to a room, so nothing typed or attached for one chat is sent to another.
  const [drafts, setDrafts] = useState({});
  const [recordingRoomId, setRecordingRoomId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const recordingRef = useRef(null);
  const selectedRoomIdRef = useRef(selectedRoomId);
  const sendMessageRef = useRef(sendMessage);

  selectedRoomIdRef.current = selectedRoomId;
  sendMessageRef.current = sendMessage;

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

  const openRoom = (roomId) => {
    if (roomId === roomParam) return;
    setSearchParams({ room: roomId }, { replace: Boolean(roomParam) });
  };

  // Back to the list (phones): the room is closed and left, so nothing is marked read behind the list.
  const closeRoom = () => setSearchParams({}, { replace: true });

  /** Stops a recording. Discarded recordings are never sent; the mic is released either way. */
  const stopRecording = useCallback((discard) => {
    const session = recordingRef.current;
    if (!session) return;
    recordingRef.current = null;
    session.discard = discard;
    setRecordingRoomId(null);
    if (session.recorder.state !== "inactive") {
      session.recorder.stop();
    } else {
      releaseStream(session.stream);
    }
  }, []);

  useEffect(() => {
    if (recordingRef.current && recordingRef.current.roomId !== selectedRoomId) stopRecording(true);
  }, [selectedRoomId, stopRecording]);

  useEffect(() => () => stopRecording(true), [stopRecording]);

  const draft = (selectedRoomId && drafts[selectedRoomId]) || EMPTY_DRAFT;

  const updateDraft = (roomId, changes) =>
    setDrafts((current) => ({ ...current, [roomId]: { ...(current[roomId] || EMPTY_DRAFT), ...changes } }));

  const handleSend = () => {
    const roomId = selectedRoomId;
    if (!roomId || (!draft.text.trim() && !draft.file)) return;
    // The pending bubble now holds the text and file; a failed send is retried from the bubble.
    if (sendMessage({ roomId, text: draft.text, file: draft.file })) {
      setDrafts((current) => ({ ...current, [roomId]: EMPTY_DRAFT }));
    }
  };

  const handleStartRecording = async () => {
    const roomId = selectedRoomId;
    if (!roomId || recordingRef.current) return;
    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The user switched chats or left the page while the permission prompt was open.
      if (selectedRoomIdRef.current !== roomId) {
        releaseStream(stream);
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      const session = { recorder, stream, roomId, chunks: [], startedAt: Date.now(), discard: false };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) session.chunks.push(event.data);
      };

      recorder.onstop = () => {
        releaseStream(stream);
        if (session.discard || !session.chunks.length) return;
        const duration = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
        const blob = new Blob(session.chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        sendMessageRef.current({ roomId: session.roomId, file, type: "voice", duration });
      };

      recorder.onerror = () => {
        if (recordingRef.current === session) stopRecording(true);
        releaseStream(stream);
        toast.error("Recording stopped unexpectedly");
      };

      recordingRef.current = session;
      recorder.start();
      setRecordingRoomId(roomId);
    } catch {
      releaseStream(stream);
      if (recordingRef.current?.stream === stream) recordingRef.current = null;
      setRecordingRoomId(null);
      toast.error("Microphone access is required to record voice notes");
    }
  };

  const handleLeaveGroup = async (room) => {
    try {
      await leaveGroup(room.roomId);
      setShowDetails(false);
      setSearchParams(withoutRoom(room.roomId), { replace: true });
      toast.success(`You left ${room.displayName || "the group"}`);
    } catch (leaveError) {
      toast.error(leaveError?.response?.data?.message || "Couldn't leave the group");
    }
  };

  const showConnectionBanner = !isConnected && connectionStatus !== "connecting";

  return (
    <div data-guide="messages-shell" className="relative flex h-[calc(100dvh-128px)] min-h-0 overflow-hidden rounded-xl border border-[#E5EAF2] bg-white max-md:h-[calc(100dvh-96px)] max-md:rounded-none max-md:border-x-0">
      <div
        data-guide="messages-conversations"
        className={`fixed inset-y-0 left-0 z-50 w-screen bg-white transition-transform duration-300 md:static md:w-[360px] md:translate-x-0 ${
          selectedRoomId ? "-translate-x-full" : "translate-x-0"
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
        />
      </div>

      <main data-guide="messages-chat-area" className="flex min-w-0 flex-1 flex-col">
        {selectedRoomId ? (
          <>
            <ChatHeader
              selectedChat={selectedRoom || { displayName: "Conversation", avatarInfo: null }}
              onBack={closeRoom}
              onToggleDetails={() => setShowDetails((value) => !value)}
            />
            {showConnectionBanner && (
              <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">
                {connectionStatus === "unauthenticated"
                  ? "Your session has expired. Sign in again to keep chatting."
                  : "You're offline. Messages you send will go out when you reconnect."}
              </div>
            )}
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <MessageList
                  key={selectedRoomId}
                  messages={messages}
                  isLoading={isLoadingMessages}
                  error={thread.status === "error" ? thread.error : null}
                  onRetry={retryJoin}
                  hasMore={thread.hasMore}
                  loadingOlder={thread.loadingOlder}
                  olderError={thread.olderError}
                  onLoadOlder={loadOlderMessages}
                  onRetryMessage={retryMessage}
                  onDiscardMessage={discardMessage}
                  isGroup={Boolean(selectedRoom?.isGroup)}
                  otherUserId={selectedRoom?.otherParticipantId || ""}
                  currentUserId={currentUserId || ""}
                />
                <MessageInput
                  newMessage={draft.text}
                  setNewMessage={(text) => updateDraft(selectedRoomId, { text })}
                  onSendText={handleSend}
                  onFileSelected={(file) => file && updateDraft(selectedRoomId, { file })}
                  selectedFile={draft.file}
                  onClearFile={() => updateDraft(selectedRoomId, { file: null })}
                  isUploading={false}
                  isRecording={recordingRoomId === selectedRoomId}
                  onStartRecording={handleStartRecording}
                  onStopRecording={() => stopRecording(false)}
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
                  <div data-guide="messages-details" className="fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[360px] shadow-2xl xl:static xl:z-auto xl:w-[360px] xl:shadow-none">
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
          <div className="flex flex-1 items-center justify-center bg-[#F8FAFD] p-6 text-center">
            <div>
              <h2 className="text-lg font-bold text-[#101828]">Select a conversation</h2>
              <p className="mt-2 text-sm text-[#667085]">
                {error || "Messages from teachers and school staff will appear here."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Messages;
