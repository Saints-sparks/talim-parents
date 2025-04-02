import React from 'react';
import { FaReply, FaPaperPlane, FaTrash, FaDownload } from 'react-icons/fa';
import { IoIosArrowDown } from "react-icons/io";

function MessageItem({ 
  msg, 
  openDropdownId, 
  toggleDropdown, 
  handleReplyMessage, 
  handleForwardMessage, 
  handleDeleteMessage 
}) {
  return (
    <div 
      className={`relative p-2 md:p-3 max-w-[85%] md:max-w-[70%] rounded-lg ${
        msg.sender === "user" ? "bg-cyan-800/50 text-white ml-auto" : "bg-white text-black shadow-sm"
      }`}
    >
      {msg.replyTo && (
        <div className="text-xs text-gray-500 bg-gray-200 p-1 rounded mb-1">
          "{msg.replyTo.text}"
        </div>
      )}

      {msg.type === "file" ? (
        <>
          {msg.fileType.startsWith("image/") ? (
            <img src={msg.fileURL} alt="Uploaded file" className="rounded-lg max-w-full h-auto" />
          ) : msg.fileType.startsWith("video/") ? (
            <video controls className="rounded-lg max-w-full">
              <source src={msg.fileURL} type={msg.fileType} />
              Your browser does not support the video tag.
            </video>
          ) : msg.fileType.startsWith("audio/") ? (
            <audio controls className="w-full">
              <source src={msg.fileURL} type={msg.fileType} />
              Your browser does not support the audio element.
            </audio>
          ) : (
            <a href={msg.fileURL} download={msg.fileName} className="text-blue-300 underline break-all hover:text-blue-200">
              📎 {msg.fileName}
            </a>
          )}
        </>
      ) : (
        <p className="break-words text-sm md:text-base">{msg.text}</p>
      )}
      
      <small className="text-xs opacity-70 block mt-1">{msg.timestamp}</small>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          toggleDropdown(msg.id);
        }} 
        className="absolute top-2 right-2 text-gray-500"
      >
        <IoIosArrowDown />
      </button>

      {openDropdownId === msg.id && (
        <div 
          className="absolute text-gray-600 bg-white shadow-md rounded-lg p-2 z-50 message-options-dropdown"
          style={{ right: 0, top: "100%", minWidth: "150px" }}
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
            <FaPaperPlane className="text-gray-600" /> <span>Forward</span>
          </button>
          <button
            onClick={() => handleDeleteMessage(msg.id)}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full text-red-500"
          >
            <FaTrash /> <span>Delete</span>
          </button>
          {msg.type === "file" && (
            <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full">
              <FaDownload className="text-gray-600" /> <span>Download</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageItem;