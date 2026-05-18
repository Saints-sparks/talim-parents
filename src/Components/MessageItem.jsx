import React, { useState } from "react";
import { FaReply, FaPaperPlane, FaTrash, FaDownload } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";
import { FaPlay } from "react-icons/fa";
import ImageModal from "./ImageModal";
import VideoModal from "./VideoModal";
import { generateColorFromString, getUserInitials } from "../lib/colorUtils";

function MessageItem({
  msg,
  openDropdownId,
  toggleDropdown,
  handleReplyMessage,
  handleForwardMessage,
  handleDeleteMessage,
}) {
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [isVideoModalOpen, setVideoModalOpen] = useState(false);
  const [zoomedMediaURL, setZoomedMediaURL] = useState("");

  // Get sender info with real data
  const senderName = msg.senderName || msg.sender || "Unknown";
  const isUserMessage = msg.sender === "user" || msg.senderType === "self";
  const initials = getUserInitials(senderName);
  const bgColor = generateColorFromString(senderName);

  const handleMediaClick = (url, type) => {
    setZoomedMediaURL(url);
    if (type === "image") {
      setImageModalOpen(true);
    } else if (type === "video") {
      setVideoModalOpen(true);
    }
  };

  return (
    <div
      className={`relative flex items-end ${
        isUserMessage ? "justify-end" : "justify-start"
      } gap-2 px-2 sm:px-0 mb-3`}
    >
      <div
        className={`flex gap-2 max-w-[85%] sm:max-w-md ${
          isUserMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar - only show for other users, not self */}
        {!isUserMessage && (
          <div className="relative w-8 h-8 flex-shrink-0 self-end mb-1">
            {msg.userAvatar ? (
              <img
                src={msg.userAvatar}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs"
                style={{ backgroundColor: bgColor }}
              >
                {initials}
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        <div
          className={`flex flex-col ${
            isUserMessage ? "items-end" : "items-start"
          }`}
        >
          {/* Sender Name - only show for group messages from others */}
          {!isUserMessage && senderName !== "Unknown" && (
            <div className="mb-1 px-1">
              <p className="text-xs font-semibold" style={{ color: bgColor }}>
                {senderName}
              </p>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`relative px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-sm ${
              isUserMessage
                ? "bg-blue-500 text-white rounded-br-md"
                : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
            }`}
          >
            {msg.replyTo && (
              <div className="text-xs text-gray-500 bg-gray-200 p-1 rounded mb-1">
                "{msg.replyTo.text}"
              </div>
            )}

            {msg.type === "file" ? (
              msg.isLoading ? (
                <div className="flex justify-center items-center w-full h-[150px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <>
                  {msg.fileType.startsWith("image") ? (
                    <div className="relative group">
                      <img
                        src={msg.fileURL}
                        alt="Uploaded"
                        className="rounded-lg max-w-full h-auto cursor-pointer max-h-60 object-cover"
                        onClick={() => handleMediaClick(msg.fileURL, "image")}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-lg">
                        <div className="bg-white p-2 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : msg.fileType.startsWith("video") ? (
                    <div className="relative group">
                      <video
                        className="rounded-lg max-w-full max-h-60 cursor-pointer"
                        onClick={() => handleMediaClick(msg.fileURL, "video")}
                      >
                        <source src={msg.fileURL} type="video/mp4" />
                      </video>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-lg">
                        <div className="bg-white p-3 rounded-full">
                          <FaPlay className="text-black" />
                        </div>
                      </div>
                    </div>
                  ) : msg.fileType.startsWith("audio") ? (
                    <div className="flex items-center space-x-2">
                      <button className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center">
                        <FaPlay size={12} />
                      </button>
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/727/727269.png"
                        alt="audio waveform"
                        className="h-8 w-auto"
                      />
                      <span className="text-sm">00:08</span>
                    </div>
                  ) : (
                    <a
                      href={msg.fileURL}
                      download={msg.fileName}
                      className="text-blue-300 underline break-all hover:text-blue-200"
                    >
                      📎 {msg.fileName}
                    </a>
                  )}
                  {msg.caption && (
                    <p
                      className={`mt-2 text-sm ${
                        isUserMessage ? "text-gray-200" : "text-gray-700"
                      }`}
                    >
                      {msg.caption}
                    </p>
                  )}
                </>
              )
            ) : (
              <p className="break-words text-sm md:text-base leading-relaxed">
                {msg.text}
              </p>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown(msg.id);
              }}
              className={`absolute top-2 right-2 ${
                isUserMessage ? "text-gray-200" : "text-gray-500"
              }`}
            >
              <IoIosArrowDown />
            </button>

            {openDropdownId === msg.id && (
              <div
                className={`absolute ${
                  isUserMessage ? "right-0" : "left-0"
                } text-gray-600 bg-white shadow-md rounded-lg p-2 z-50`}
                style={{ top: "100%", minWidth: "150px" }}
              >
                <button
                  onClick={() => handleReplyMessage(msg)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full"
                >
                  <FaReply className="text-gray-600" /> <span>Reply</span>
                </button>
                <button
                  onClick={() => handleForwardMessage(msg)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full"
                >
                  <FaPaperPlane className="text-gray-600" />{" "}
                  <span>Forward</span>
                </button>
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full text-red-500"
                >
                  <FaTrash /> <span>Delete</span>
                </button>
                {msg.type === "file" && !msg.isLoading && (
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = msg.fileURL;
                      link.download = msg.fileName || "file";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full"
                  >
                    <FaDownload className="text-gray-600" />{" "}
                    <span>Download</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Time and Status */}
          <div
            className={`flex items-center gap-1 text-xs text-gray-400 mt-1 px-1 ${
              isUserMessage ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <span>{msg.timestamp}</span>
            {isUserMessage && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                className="text-blue-400"
                fill="currentColor"
              >
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={zoomedMediaURL}
        onClose={() => setImageModalOpen(false)}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        videoUrl={zoomedMediaURL}
        onClose={() => setVideoModalOpen(false)}
      />
    </div>
  );
}

export default MessageItem;
