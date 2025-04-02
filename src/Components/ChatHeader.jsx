import React from 'react';
import { Phone, Search, Video } from "lucide-react";
import { FaArrowLeft } from 'react-icons/fa';

function ChatHeader({ selectedChat, setShowSidebar, setShowDetailsModal }) {
  return (
    <div className="bg-white p-2 md:p-4 flex items-center justify-between border-b shadow-sm">
      <div className="flex items-center space-x-3">
        <button 
          className="md:hidden text-gray-600 hover:text-gray-900 mr-2 p-1"
          onClick={() => setShowSidebar(true)}
        >
          <FaArrowLeft className="w-5 h-5" />
        </button>
        <img
          src={selectedChat.profilePic}
          alt="Profile"
          className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover cursor-pointer"
          onClick={() => setShowDetailsModal(true)}
        />
        <div className="min-w-0">
          <h3 className="text-base md:text-lg font-semibold truncate pr-2">
            {selectedChat.name}
          </h3>
          <p className="text-xs md:text-sm text-cyan-800">
            {selectedChat.status === 'typing' ? 'typing...' : 'Online'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <Phone className="text-gray-500 cursor-pointer hover:text-cyan-800/50 w-4 h-4 md:w-5 md:h-5" />
        <Video className="text-gray-500 cursor-pointer hover:text-cyan-800/50 w-4 h-4 md:w-5 md:h-5" />
        <Search className="text-gray-500 cursor-pointer hover:text-cyan-800/50 w-4 h-4 md:w-5 md:h-5" />
      </div>
    </div>
  );
}

export default ChatHeader;