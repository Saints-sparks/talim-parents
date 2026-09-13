/* eslint-disable react/prop-types */
import { Download, FileText } from "lucide-react";

// Every chat attachment (message bubbles, conversation details) renders through here.

const formatDuration = (seconds) => {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const MessageAttachment = ({ attachment, isUserMessage, messageDuration }) => {
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

export default MessageAttachment;
