import { useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { Image, Mic, Paperclip, Send, X } from 'lucide-react';
import {
  ATTACHMENT_ACCEPT,
  ComposerAttachments,
  IMAGE_ACCEPT,
  formatDuration,
  useVoiceRecorder,
  type VoiceRecording,
} from './chat-kit';

const ICON_BUTTON = 'rounded-lg bg-[#F2F4F7] p-3 text-[#344054] hover:bg-[#E5EAF2] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';
const SEND_BUTTON = 'rounded-lg bg-[#0A4EA3] p-3 text-white hover:bg-[#083F83]';

/** Props for {@link MessageInput}. */
interface MessageInputProps {
  text: string;
  onTextChange: (text: string) => void;
  files?: File[];
  /** Validation messages for picked files. */
  errors?: string[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onDismissErrors: () => void;
  onSend: () => void;
  onSendVoice: (recording: VoiceRecording) => void;
}

/**
 * The message composer: text, picked files (validated by the chat kit and
 * shown above the box) and voice notes. The parent owns the draft; mount one
 * per room so a recording never outlives its chat.
 *
 * @param props - Component props.
 * @returns The composer.
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
}: MessageInputProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hitting the 5-minute limit sends what was recorded.
  const recorder = useVoiceRecorder({ onAutoStop: (recording) => recording && onSendVoice(recording) });

  const canSend = Boolean(text.trim() || files.length);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend && !recorder.isRecording) onSend();
    }
  };

  const handlePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (picked.length) onAddFiles(picked);
  };

  const handleStopAndSend = async () => {
    const recording = await recorder.stop();
    if (recording) onSendVoice(recording);
  };

  return (
    <div className="border-t border-[#E5EAF2] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <ComposerAttachments
        files={files}
        errors={errors}
        onRemove={onRemoveFile}
        onDismissErrors={onDismissErrors}
        disabled={recorder.isRecording}
        className="mb-3"
      />

      {recorder.error && !recorder.isRecording && (
        <div
          role="alert"
          className="mb-3 flex items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          <span>{recorder.error}</span>
          <button
            type="button"
            onClick={recorder.clearError}
            className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {recorder.isRecording ? (
        <div className="flex items-center gap-2">
          <div
            className="flex min-h-11 flex-1 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 dark:border-red-900/60 dark:bg-red-950/40"
            aria-live="polite"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden />
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">Recording</span>
            <span className="text-sm tabular-nums text-red-700 dark:text-red-300">{formatDuration(recorder.elapsed)}</span>
          </div>
          <button
            type="button"
            onClick={recorder.cancel}
            className={ICON_BUTTON}
            title="Cancel recording"
            aria-label="Cancel recording"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleStopAndSend}
            className={SEND_BUTTON}
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
            className={ICON_BUTTON}
            title="Attach files"
            aria-label="Attach files"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={ICON_BUTTON}
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
            placeholder={files.length ? 'Add a caption...' : 'Type your message...'}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-[#DCE5F2] px-4 py-3 text-sm outline-none focus:border-[#0A4EA3] focus:ring-2 focus:ring-[#D9E8FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
          />

          {canSend ? (
            <button type="button" onClick={onSend} className={SEND_BUTTON} title="Send message" aria-label="Send message">
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void recorder.start()}
              className={SEND_BUTTON}
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
