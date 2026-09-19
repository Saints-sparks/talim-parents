 
import { useMemo } from "react";
import { AttachmentGrid } from "./chat-kit";

/**
 * A message's attachments, drawn by the chat kit's AttachmentGrid. The bubble
 * renders the caption (`text`) below this.
 *
 * @param {object} props
 * @param {object} props.message - A normalized message (`attachments`, `duration`, `status`, `uploadProgress`).
 * @param {boolean} [props.isUserMessage] - Own messages sit on the dark bubble.
 */
function MessageAttachment({ message, isUserMessage = false }) {
  const isUnsent = message.status === "pending" || message.status === "failed";

  // Voice notes carry their length on the message; the player needs it on the attachment (WebM reports none).
  const attachments = useMemo(
    () =>
      (message.attachments || []).map((attachment) =>
        attachment.type === "audio" && !attachment.duration && message.duration
          ? { ...attachment, duration: message.duration }
          : attachment
      ),
    [message.attachments, message.duration]
  );

  if (!attachments.length) return null;

  return (
    <AttachmentGrid
      attachments={attachments}
      tone={isUserMessage ? "inverted" : "default"}
      pending={isUnsent}
      failed={message.status === "failed"}
      progress={message.status === "pending" ? message.uploadProgress : undefined}
    />
  );
}

export default MessageAttachment;
