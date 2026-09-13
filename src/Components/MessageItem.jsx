/* eslint-disable react/prop-types */
import { Download, FileText } from "lucide-react";
import { generateColorFromString, getUserInitials } from "../lib/colorUtils";
import { formatMessageTime } from "../lib/chatMessages";

const formatDuration = (seconds) => {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const Attachment = ({ attachment, isUserMessage, messageDuration }) => {
  const type = attachment.type || "";
  const mimeType = attachment.mimeType || "";

  // Still uploading inside a pending bubble.
  if (!attachment.url) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border p-3 ${
          isUserMessage ? "border-blue-300 bg-blue-400 text-white" : "border-[#E5EAF2] bg-[#F8FAFD] text-[#101828]"
        }`}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {type === "audio" ? "Voice note" : attachment.name || "Attachment"}
        </span>
      </div>
    );
  }

  if (type === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer">
        <img
          src={attachment.url}
          alt={attachment.name || "Image attachment"}
          className="max-h-64 w-full rounded-lg object-cover"
        />
      </a>
    );
  }

  if (type === "audio") {
    const duration = attachment.duration || messageDuration;
    return (
      <div className="min-w-[240px]">
        {/* A source type is only given when the server knows it; a wrong one stops playback. */}
        {mimeType.startsWith("audio/") ? (
          <audio controls preload="metadata" className="w-full">
            <source src={attachment.url} type={mimeType} />
          </audio>
        ) : (
          <audio controls preload="metadata" className="w-full" src={attachment.url} />
        )}
        {duration ? (
          <p className={`mt-1 text-xs ${isUserMessage ? "text-blue-100" : "text-[#667085]"}`}>
            {formatDuration(duration)}
          </p>
        ) : null}
      </div>
    );
  }

  if (type === "video") {
    return (
      <video controls preload="metadata" className="max-h-64 w-full rounded-lg bg-black" src={attachment.url} />
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isUserMessage ? "border-blue-300 bg-blue-400 text-white" : "border-[#E5EAF2] bg-[#F8FAFD] text-[#101828]"
      }`}
    >
      <FileText className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{attachment.name || "Attachment"}</span>
      <Download className="h-4 w-4 shrink-0" />
    </a>
  );
};

function MessageItem({ msg, onRetry, onDiscard }) {
  const isUserMessage = Boolean(msg.isOwn);
  const senderName = msg.senderName || "Unknown";
  const bgColor = generateColorFromString(senderName);
  const attachments = msg.attachments || [];
  const isPending = msg.status === "pending";
  const isFailed = msg.status === "failed";

  return (
    <div className={`flex ${isUserMessage ? "justify-end" : "justify-start"} gap-2`}>
      {!isUserMessage && (
        <div
          className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: bgColor }}
        >
          {getUserInitials(senderName)}
        </div>
      )}

      <div className={`max-w-[82%] sm:max-w-[560px] ${isUserMessage ? "items-end" : "items-start"}`}>
        {!isUserMessage && <p className="mb-1 text-xs font-semibold text-[#667085]">{senderName}</p>}
        <div
          className={`space-y-2 rounded-2xl px-4 py-3 shadow-sm ${
            isUserMessage
              ? `rounded-br-md bg-[#0A4EA3] text-white ${isPending ? "opacity-70" : ""} ${isFailed ? "ring-2 ring-red-400" : ""}`
              : "rounded-bl-md border border-[#E5EAF2] bg-white text-[#101828]"
          }`}
        >
          {attachments.map((attachment, index) => (
            <Attachment
              key={`${attachment.url || attachment.name}-${index}`}
              attachment={attachment}
              isUserMessage={isUserMessage}
              messageDuration={msg.duration}
            />
          ))}
          {msg.text ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{msg.text}</p> : null}
        </div>
        <div className={`mt-1 text-xs ${isUserMessage ? "text-right" : "text-left"}`}>
          {isFailed ? (
            <span className="text-red-600" title={msg.error || undefined}>
              Not sent ·{" "}
              <button type="button" onClick={() => onRetry?.(msg)} className="font-semibold underline">
                Retry
              </button>{" "}
              ·{" "}
              <button type="button" onClick={() => onDiscard?.(msg)} className="font-semibold underline">
                Delete
              </button>
            </span>
          ) : isPending ? (
            <span className="text-[#98A2B3]">Sending…</span>
          ) : (
            <span className="text-[#98A2B3]">{formatMessageTime(msg.createdAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageItem;
