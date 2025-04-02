import React from 'react';
import { FaPaperclip, FaMicrophone, FaPaperPlane, FaStop } from 'react-icons/fa';

function MessageInput({
  fileInputRef,
  handleFileChange,
  newMessage,
  setNewMessage,
  handleKeyPress,
  sendMessage,
  isRecording,
  handleStartRecording,
  handleStopRecording
}) {
  return (
    <div className="sticky bottom-0 bg-white border-t shadow-sm">
      <div className="px-2 sm:px-4 py-2 sm:py-3 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Attachment button */}
          <button 
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current.click()}
            title="Attach file"
          >
            <FaPaperclip className="text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Message input */}
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base 
                rounded-full border border-gray-200 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                bg-gray-50 placeholder-gray-500"
            />
          </div>

          {/* Send/Record buttons container */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Send button - Show only when there's text */}
            {newMessage.trim() && (
              <button 
                onClick={sendMessage}
                className="p-1.5 sm:p-2 bg-blue-500 hover:bg-blue-600 
                  text-white rounded-full transition-colors"
                title="Send message"
              >
                <FaPaperPlane className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Record button - Show only when there's no text */}
            {!newMessage.trim() && (
              <button 
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`p-1.5 sm:p-2 rounded-full transition-colors
                  ${isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'hover:bg-gray-100'
                  }`}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? (
                  <FaStop className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <FaMicrophone className="text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-8 left-0 right-0 text-center">
            <span className="inline-block px-3 py-1 bg-red-500 text-white text-sm rounded-full animate-pulse">
              Recording...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageInput;