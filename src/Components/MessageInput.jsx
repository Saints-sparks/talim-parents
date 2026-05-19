/* eslint-disable react/prop-types */
import { useRef } from "react";
import { Image, Mic, Paperclip, Send, Square, X } from "lucide-react";

function MessageInput({
  newMessage,
  setNewMessage,
  onSendText,
  onFileSelected,
  isUploading,
  isRecording,
  onStartRecording,
  onStopRecording,
  selectedFile,
  onClearFile,
}) {
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const canSend = newMessage.trim() || selectedFile;

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSendText();
    }
  };

  return (
    <div className="border-t border-[#E5EAF2] bg-white p-3">
      {selectedFile && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[#DCE5F2] bg-[#F8FAFD] px-3 py-2">
          <span className="truncate text-sm font-semibold text-[#344054]">{selectedFile.name}</span>
          <button type="button" onClick={onClearFile} className="rounded-md p-1 text-[#667085] hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFileSelected(event.target.files?.[0])}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,application/pdf,.doc,.docx"
          className="hidden"
          onChange={(event) => onFileSelected(event.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-[#F2F4F7] p-3 text-[#344054] hover:bg-[#E5EAF2]"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="rounded-lg bg-[#F2F4F7] p-3 text-[#344054] hover:bg-[#E5EAF2]"
          title="Attach image"
        >
          <Image className="h-5 w-5" />
        </button>

        <textarea
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type your message..."
          className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-[#DCE5F2] px-4 py-3 text-sm outline-none focus:border-[#0A4EA3] focus:ring-2 focus:ring-[#D9E8FF]"
          disabled={isUploading}
        />

        {canSend ? (
          <button
            type="button"
            onClick={onSendText}
            disabled={isUploading}
            className="rounded-lg bg-[#0A4EA3] p-3 text-white hover:bg-[#083F83] disabled:cursor-not-allowed disabled:opacity-60"
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`rounded-lg p-3 text-white ${
              isRecording ? "bg-red-600 hover:bg-red-700" : "bg-[#0A4EA3] hover:bg-[#083F83]"
            }`}
            title={isRecording ? "Stop recording" : "Record voice message"}
          >
            {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
      </div>

      {isRecording && <p className="mt-2 text-center text-sm font-semibold text-red-600">Recording...</p>}
    </div>
  );
}

export default MessageInput;
