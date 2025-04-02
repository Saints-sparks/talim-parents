import React, { useState } from "react";
import { FaSearch, FaCheckDouble } from 'react-icons/fa';
import { IoIosArrowDown } from "react-icons/io";
import { chats} from "../data/chats";

function MessagesSidebar({ setSelectedChat }) {
    const [selectedFilter, setSelectedFilter] = useState("All");
    const [showDropdown, setShowDropdown] = useState(false);
  
    const filters = ["All", "Unread", "Drafts", "Archived", "Trash", "Groups"];
  return (
    <div className="w-full md:w-[300px] bg-white border-r h-full md:h-screen overflow-hidden z-50 relative md:z-auto">
      <div className="p-3 md:p-4">
        {/* Title */}
        <h2 className="text-lg font-semibold mb-3 md:mb-4">Messages</h2>

        {/* Search & Filter */}
        <div className="flex items-center space-x-2 mb-3 md:mb-4">
          <div className="flex items-center border rounded-md p-2 flex-grow">
            <FaSearch className="text-gray-400 mr-2 min-w-[16px]" />
            <input 
              type="text" 
              placeholder="Search messages..." 
              className="w-full outline-none text-sm truncate"
            />
          </div>
          <div className="relative">
  <button 
    onClick={() => setShowDropdown(!showDropdown)} 
    className="border rounded-md p-2 hover:bg-gray-50 text-xs active:bg-gray-100 transition-colors flex items-center"
  >
    {selectedFilter} <IoIosArrowDown className="text-gray-500 ml-1" />
  </button>
  {showDropdown && (
    <ul className="absolute top-full left-0 bg-white border rounded-md shadow-md w-40 py-1 z-10">
      {filters.map((filter, index) => (
        <li
          key={index}
          onClick={() => {
            setSelectedFilter(filter);
            setShowDropdown(false);
          }}
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
        >
          {filter}
        </li>
      ))}
    </ul>
  )}
</div>

        </div>

        {/* Chat List */}
        <div className="mt-2 md:mt-4 space-y-2 md:space-y-4 overflow-y-auto h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] pb-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className="flex items-center p-2 md:p-3 rounded-lg hover:bg-gray-100 active:bg-gray-200 cursor-pointer transition-colors"
            >
              <img 
                src={chat.profilePic} 
                alt="Profile" 
                className="w-8 h-8 md:w-10 md:h-10 rounded-full mr-2 md:mr-3" 
              />
              <div className="flex-1 min-w-0"> {/* min-w-0 helps with text truncation */}
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold truncate pr-2">{chat.name}</h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{chat.time}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  {chat.status === 'typing' ? (
                    <span className="text-cyan-800/50">typing...</span>
                  ) : (
                    <div className="flex items-center w-full">
                      <span className="truncate">{chat.message}</span>
                      {chat.status === 'sent' && (
                        <FaCheckDouble className="text-cyan-800/50 ml-2 flex-shrink-0" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MessagesSidebar;