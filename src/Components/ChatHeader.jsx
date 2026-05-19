/* eslint-disable react/prop-types */
import { ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";

function ChatHeader({ selectedChat, setShowSidebar, onToggleDetails }) {
  if (!selectedChat) return null;

  return (
    <div className="flex items-center justify-between border-b border-[#E5EAF2] bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-[#667085] hover:bg-[#F2F4F7] md:hidden"
          onClick={() => setShowSidebar(true)}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {selectedChat.avatarInfo?.type === "image" ? (
          <img
            src={selectedChat.avatarInfo.value}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: selectedChat.avatarInfo?.bgColor || "#0A4EA3" }}
          >
            {selectedChat.avatarInfo?.value || "U"}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[#101828]">{selectedChat.displayName}</h3>
          <p className="text-sm text-[#667085]">
            {selectedChat.isGroup
              ? `${selectedChat.participantCount || 0} members`
              : selectedChat.isOnline
              ? "Online"
              : selectedChat.role || "Conversation"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg border border-[#E5EAF2] p-2 text-[#344054]">
          <Phone className="h-5 w-5" />
        </button>
        <button type="button" className="rounded-lg border border-[#E5EAF2] p-2 text-[#344054]">
          <Video className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleDetails}
          className="rounded-lg border border-[#E5EAF2] p-2 text-[#344054]"
          aria-label="Conversation details"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
