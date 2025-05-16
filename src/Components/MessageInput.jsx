import React from 'react';
import { FaPaperPlane, FaStop } from 'react-icons/fa';
import { HiOutlineDocumentText, HiOutlineVideoCamera, HiOutlinePhotograph } from 'react-icons/hi';
import { BsMicFill, BsPlayFill } from 'react-icons/bs';

function MessageInput({
  fileInputRef,
  handleFileChange,
  newMessage,
  setNewMessage,
  handleKeyPress,
  sendMessage,
  isRecording,
  handleStartRecording,
  handleStopRecording,
  handleOpenModal,
  audioBlob,
  handlePlayAudio
}) {
  return (
    <div className="sticky bottom-0 bg-white border-t shadow-sm">
      <div className="px-2 sm:px-4 py-2 sm:py-3 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              className="flex items-center px-3 py-1.5 rounded-md border text-sm border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500"
              onClick={() => handleOpenModal("Documents")}
            >
              <HiOutlineDocumentText className="mr-1 w-5 h-5" /> Document
            </button>

            <button
              className="flex items-center px-3 py-1.5 rounded-md border text-sm border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500"
              onClick={() => handleOpenModal("Images")}
            >
              <HiOutlinePhotograph className="mr-1 w-5 h-5" /> Image
            </button>

            <button
              className="flex items-center px-3 py-1.5 rounded-md border text-sm border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500"
              onClick={() => handleOpenModal("Videos")}
            >
              <HiOutlineVideoCamera className="mr-1 w-5 h-5" /> Video
            </button>
          </div>

          <div className="relative flex-1 mx-2">
            <input
              type="text"
              placeholder="Type something here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-4 py-2 rounded-full border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {newMessage.trim() ? (
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700"
              title="Send message"
            >
              <FaPaperPlane className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`p-3 rounded-full transition-colors text-white ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 hover:bg-gray-400 text-black'
              }`}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <FaStop className="w-4 h-4" /> : <BsMicFill className="w-4 h-4" />}
            </button>
          )}
        </div>

        {audioBlob && (
          <div className="mt-2 text-center">
            <button
              onClick={handlePlayAudio}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-full shadow-sm hover:bg-gray-200"
            >
              <BsPlayFill className="text-black w-5 h-5" />
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="w-12 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <span className="text-sm text-gray-700">00:08</span>
            </button>
          </div>
        )}

        {isRecording && (
          <div className="mt-2 text-center">
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

// Sample user with image message:
export const sampleImageMessage = {
  id: 10,
  sender: "Daniel Okoro",
  profilePic: "/images/users/daniel-okoro.png", // Replace with actual profile image path
  type: "file",
  fileType: "image",
  fileURL: "/images/uploads/everyday-english.png", // Replace with actual image path
  text: "Good evening, students.\nPlease make sure to inform your parents about the Everyday English textbook.\nHave a lovely weekend!",
  timestamp: "3:10 PM"
};
