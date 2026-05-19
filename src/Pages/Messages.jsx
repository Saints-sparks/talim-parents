/* eslint-disable react/prop-types */
import { useMemo, useRef, useState } from "react";
import { Mail, Phone, UserRound, X } from "lucide-react";
import ChatHeader from "../Components/ChatHeader";
import MessageInput from "../Components/MessageInput";
import MessageList from "../Components/MessageList";
import MessagesSidebar from "../Components/MessagesSidebar";
import { toast } from "../Components/CustomToast";
import { useRealtimeChat } from "../hooks/useRealtimeChat";
import { uploadChatAttachment } from "../services/chat.services";

const getSharedAttachments = (messages, type) =>
  messages.flatMap((message) => message.attachments || []).filter((attachment) => attachment.type === type);

const getPrimaryParticipant = (room) => {
  if (!room || room.isGroup) return null;
  return room.participants?.find((participant) => participant.userId !== room.id) || room.participants?.[0];
};

function ConversationDetails({ room, messages, onClose }) {
  const images = useMemo(() => getSharedAttachments(messages, "image"), [messages]);
  const audio = useMemo(() => getSharedAttachments(messages, "audio"), [messages]);
  const participant = getPrimaryParticipant(room);

  if (!room) return null;

  return (
    <aside className="flex h-full w-full max-w-[360px] shrink-0 flex-col overflow-y-auto border-l border-[#E5EAF2] bg-white p-5">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#101828]">Conversation Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-[#667085] hover:bg-[#F2F4F7]"
          aria-label="Close conversation details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="text-center">
        {room.avatarInfo?.type === "image" ? (
          <img src={room.avatarInfo.value} alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
        ) : (
          <span
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: room.avatarInfo?.bgColor || "#0A4EA3" }}
          >
            {room.avatarInfo?.value || "U"}
          </span>
        )}
        <h4 className="mt-3 text-lg font-bold text-[#101828]">{room.displayName}</h4>
        <p className="text-sm text-[#667085]">{room.isGroup ? `${room.participantCount} members` : room.role || "Teacher"}</p>
      </div>

      <div className="my-7 grid grid-cols-3 gap-3 border-b border-[#E5EAF2] pb-6">
        {[
          [UserRound, "Profile"],
          [Phone, "Call"],
          [Mail, "Email"],
        ].map(([Icon, label]) => (
          <button key={label} type="button" className="rounded-lg p-2 text-center text-[#344054] hover:bg-[#F8FAFD]">
            <Icon className="mx-auto mb-1 h-5 w-5" />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
      </div>

      <section className="border-b border-[#E5EAF2] pb-6">
        <h4 className="mb-3 text-sm font-bold text-[#101828]">About</h4>
        <p className="text-sm leading-6 text-[#667085]">
          {room.isGroup
            ? "Group conversation for school updates and class communication."
            : `${room.displayName} is available for school communication through Talim messages.`}
        </p>
        {participant?.email && <p className="mt-2 text-sm text-[#667085]">{participant.email}</p>}
      </section>

      <section className="mt-6 border-b border-[#E5EAF2] pb-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#101828]">Voice Notes</h4>
          <span className="text-xs font-semibold text-[#0A4EA3]">{audio.length}</span>
        </div>
        <div className="space-y-2">
          {audio.slice(0, 2).map((item) => (
            <audio key={item.url} controls preload="metadata" className="w-full">
              <source src={item.url} type={item.mimeType || "audio/webm"} />
            </audio>
          ))}
          {!audio.length && <p className="text-sm text-[#98A2B3]">No voice notes yet.</p>}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#101828]">Shared Photos</h4>
          <span className="text-xs font-semibold text-[#0A4EA3]">{images.length}</span>
        </div>
        {images.length ? (
          <div className="grid grid-cols-3 gap-2">
            {images.slice(0, 6).map((image) => (
              <a key={image.url} href={image.url} target="_blank" rel="noreferrer">
                <img src={image.url} alt="" className="aspect-square rounded-lg object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#98A2B3]">No shared photos yet.</p>
        )}
      </section>
    </aside>
  );
}

function Messages() {
  const {
    chatRooms,
    messages,
    selectedRoom,
    selectedRoomId,
    isLoading,
    isLoadingMessages,
    isConnected,
    error,
    selectRoom,
    sendMessage,
  } = useRealtimeChat();

  const [newMessage, setNewMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    try {
      setIsUploading(true);
      const attachments = selectedFile ? [await uploadChatAttachment(selectedFile)] : [];
      const attachmentType = attachments[0]?.type;

      sendMessage({
        content: newMessage,
        attachments,
        type: attachmentType === "audio" ? "voice" : attachmentType === "image" ? "image" : "text",
        duration: attachments[0]?.duration,
      });

      setNewMessage("");
      setSelectedFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Unable to send attachment");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const duration = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });

        try {
          setIsUploading(true);
          const attachment = await uploadChatAttachment(file);
          sendMessage({
            content: "",
            attachments: [{ ...attachment, duration }],
            type: "voice",
            duration,
          });
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || "Unable to send voice note");
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access is required to record voice notes");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="relative flex h-[calc(100dvh-128px)] min-h-0 overflow-hidden rounded-xl border border-[#E5EAF2] bg-white max-md:h-[calc(100dvh-96px)] max-md:rounded-none max-md:border-x-0">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-screen bg-white transition-transform duration-300 md:static md:w-[360px] md:translate-x-0 ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <MessagesSidebar
          rooms={chatRooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={(roomId) => {
            selectRoom(roomId);
            setShowSidebar(false);
            setShowDetails(false);
          }}
          isLoading={isLoading}
          isConnected={isConnected}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        {selectedRoom ? (
          <>
            <ChatHeader
              selectedChat={selectedRoom}
              setShowSidebar={setShowSidebar}
              onToggleDetails={() => setShowDetails((value) => !value)}
            />
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <MessageList messages={messages} messagesEndRef={messagesEndRef} isLoading={isLoadingMessages} />
                <MessageInput
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  onSendText={handleSend}
                  onFileSelected={setSelectedFile}
                  selectedFile={selectedFile}
                  onClearFile={() => setSelectedFile(null)}
                  isUploading={isUploading}
                  isRecording={isRecording}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                />
              </div>
              {showDetails && (
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
                      onClose={() => setShowDetails(false)}
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
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                className="mt-4 rounded-lg bg-[#0A4EA3] px-4 py-2 text-sm font-semibold text-white md:hidden"
              >
                Open Chats
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Messages;
