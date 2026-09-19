 
import { useRef } from "react";
import { Image, Mic, Paperclip, Send, X } from "lucide-react";
import {
  ATTACHMENT_ACCEPT,
  ComposerAttachments,
  IMAGE_ACCEPT,
  formatDuration,
  useVoiceRecorder,
} from "./chat-kit";

/**
 * The message composer: text, picked files (validated by the chat kit and
 * shown above the box) and voice notes. The parent owns the draft; mount one
 * per room so a recording never outlives its chat.
 *
 * @param {object} props
 * @param {string} props.text
 * @param {(text: string) => void} props.onTextChange
 * @param {File[]} props.files
 * @param {string[]} props.errors - Validation messages for picked files.
 * @param {(files: File[]) => void} props.onAddFiles
 * @param {(index: number) => void} props.onRemoveFile
 * @param {() => void} props.onDismissErrors
 * @param {() => void} props.onSend
 * @param {(recording: { file: File, duration: number }) => void} props.onSendVoice
 */
function MessageInput({
  text,
  onTextChange,
  files = [],
  errors = [],
  onAddFiles,
  onRemoveFile,
  onDismissErrors,
  onSend,
  onSendVoice,
}) {
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  // Hitting the 5-minute limit sends what was recorded.
  const recorder = useVoiceRecorder({ onAutoStop: (recording) => recording && onSendVoice(recording) });

  const canSend = Boolean(text.trim() || files.length);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend && !recorder.isRecording) onSend();
    }
  };

  const handlePicked = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (picked.length) onAddFiles(picked);
  };

  const handleStopAndSend = async () => {
    const recording = await recorder.stop();
    if (recording) onSendVoice(recording);
  };

  return (
    <div className="border-t border-[#E5EAF2] bg-white p-3">
      <ComposerAttachments
        files={files}
        errors={errors}
        onRemove={onRemoveFile}
        onDismissErrors={onDismissErrors}
        disabled={recorder.isRecording}
        className="mb-3"
      />

      {recorder.error && !recorder.isRecording && (
        <div role="alert" className="mb-3 flex items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{recorder.error}</span>
          <button type="button" onClick={recorder.clearError} className="rounded p-0.5 hover:bg-red-100" aria-label="Dismiss">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {recorder.isRecording ? (
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 flex-1 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4" aria-live="polite">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden />
            <span className="text-sm font-semibold text-red-700">Recording</span>
            <span className="text-sm tabular-nums text-red-700">{formatDuration(recorder.elapsed)}</span>
          </div>
          <button
            type="button"
            onClick={recorder.cancel}
            className="rounded-lg bg-[#F2F4F7] p-3 text-[#344054] hover:bg-[#E5EAF2]"
            title="Cancel recording"
            aria-label="Cancel recording"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleStopAndSend}
            className="rounded-lg bg-[#0A4EA3] p-3 text-white hover:bg-[#083F83]"
            title="Stop and send voice note"
            aria-label="Stop and send voice note"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input ref={imageInputRef} type="file" multiple accept={IMAGE_ACCEPT} className="hidden" onChange={handlePicked} />
          <input ref={fileInputRef} type="file" multiple accept={ATTACHMENT_ACCEPT} className="hidden" onChange={handlePicked} />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-[#F2F4F7] p-3 text-[#344054] hover:bg-[#E5EAF2]"
            title="Attach files"
            aria-label="Attach files"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="rounded-lg bg-[#F2F4F7] p-3 text-[#344054] hover:bg-[#E5EAF2]"
            title="Attach photos"
            aria-label="Attach photos"
          >
            <Image className="h-5 w-5" />
          </button>

          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={files.length ? "Add a caption..." : "Type your message..."}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-[#DCE5F2] px-4 py-3 text-sm outline-none focus:border-[#0A4EA3] focus:ring-2 focus:ring-[#D9E8FF]"
          />

          {canSend ? (
            <button
              type="button"
              onClick={onSend}
              className="rounded-lg bg-[#0A4EA3] p-3 text-white hover:bg-[#083F83]"
              title="Send message"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => recorder.start()}
              className="rounded-lg bg-[#0A4EA3] p-3 text-white hover:bg-[#083F83]"
              title="Record voice note"
              aria-label="Record voice note"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageInput;
