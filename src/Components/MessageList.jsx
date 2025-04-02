import React from 'react';
import MessageItem from './MessageItem';

function MessageList({
  messages,
  openDropdownId,
  toggleDropdown,
  handleReplyMessage,
  handleForwardMessage,
  handleDeleteMessage,
  replyingTo,
  newMessage,
  setNewMessage,
  setMessages,
  setReplyingTo,
  sendMessage
}) {
  return (
    <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-3 bg-gray-50 relative">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          msg={msg}
          openDropdownId={openDropdownId}
          toggleDropdown={toggleDropdown}
          handleReplyMessage={handleReplyMessage}
          handleForwardMessage={handleForwardMessage}
          handleDeleteMessage={handleDeleteMessage}
        />
      ))}

      {replyingTo && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-200 flex items-center">
          <span className="text-xs text-gray-600 mr-2">Replying to: "{replyingTo.text}"</span>
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 p-2 border rounded"
          />
          <button 
            className="ml-2 bg-cyan-800 text-white px-3 py-1 rounded"
            onClick={() => {
              setMessages(prev => [...prev, { 
                id: Date.now(), 
                sender: "user", 
                text: newMessage, 
                replyTo: replyingTo 
              }]);
              setReplyingTo(null);
              setNewMessage("");
              sendMessage();
            }}
          >
            <FaPaperPlane className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default MessageList;