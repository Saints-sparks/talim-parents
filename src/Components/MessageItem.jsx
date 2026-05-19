/* eslint-disable react/prop-types */
import { Download, FileText } from "lucide-react";
import { generateColorFromString, getUserInitials } from "../lib/colorUtils";

const formatDuration = (seconds) => {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const Attachment = ({ attachment, isUserMessage }) => {
  const type = attachment.type || "";
  const mimeType = attachment.mimeType || "";

  if (type === "image" || mimeType.startsWith("image/")) {
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

  if (type === "audio" || mimeType.startsWith("audio/")) {
    return (
      <div className="min-w-[240px]">
        <audio controls preload="metadata" className="w-full">
          <source src={attachment.url} type={mimeType || "audio/webm"} />
        </audio>
        {attachment.duration ? (
          <p className={`mt-1 text-xs ${isUserMessage ? "text-blue-100" : "text-[#667085]"}`}>
            {formatDuration(attachment.duration)}
          </p>
        ) : null}
      </div>
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

function MessageItem({ msg }) {
  const isUserMessage = msg.sender === "user" || msg.senderType === "self";
  const senderName = msg.senderName || "Unknown";
  const bgColor = generateColorFromString(senderName);
  const attachments = msg.attachments || [];

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
              ? "rounded-br-md bg-[#0A4EA3] text-white"
              : "rounded-bl-md border border-[#E5EAF2] bg-white text-[#101828]"
          }`}
        >
          {attachments.map((attachment, index) => (
            <Attachment key={`${attachment.url}-${index}`} attachment={attachment} isUserMessage={isUserMessage} />
          ))}
          {msg.text ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{msg.text}</p> : null}
        </div>
        <div className={`mt-1 text-xs text-[#98A2B3] ${isUserMessage ? "text-right" : "text-left"}`}>
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}

export default MessageItem;
