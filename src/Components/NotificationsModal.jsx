import React from "react";
import { useNavigate } from "react-router-dom";

const NotificationsModal = ({ closeModal, unreadNotifications }) => {
  const navigate = useNavigate(); // Initialize navigation

  // Function to truncate message
  const truncateMessage = (message, maxLength = 50) => {
    return message.length > maxLength 
      ? `${message.substring(0, maxLength)}...` 
      : message;
  };

  // Function to handle navigation
  const handleNavigate = (id) => {
    closeModal(); // Close modal
    navigate(`/notifications/${id}`); // Navigate to notification details
  };

  return (
    <div className="absolute top-12 right-2 bg-white border shadow-lg rounded-lg w-80 z-[999]">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-100 rounded-t-lg">
        <h3 className="font-semibold text-lg">
          Notifications <span className="text-blue-500">({unreadNotifications.length} new)</span>
        </h3>
        <button 
          onClick={closeModal} 
          className="text-gray-500 hover:text-black text-xl"
          aria-label="Close notifications"
        >
          ✕
        </button>
      </div>

      {/* Display unread notifications */}
      {unreadNotifications.length > 0 ? (
        <ul className="max-h-80 overflow-y-auto">
          {unreadNotifications.map((notif) => (
            <li 
              key={notif.id} 
              className="flex items-start px-4 py-3 border-b last:border-none hover:bg-gray-50 cursor-pointer"
              onClick={() => handleNavigate(notif.id)} // Navigate on click
            >
              {/* Profile Icon */}
              <div className="flex-shrink-0">
                <img
                  src={notif.senderProfile || "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250"}
                  alt="Sender"
                  className="w-10 h-10 rounded-full object-cover mr-3"
                />
              </div>

              {/* Notification Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{notif.sender}</p>
                <p 
                  className="text-gray-600 text-sm truncate"
                  title={notif.message} // Show full message on hover
                >
                  {truncateMessage(notif.message, 60)}
                </p>
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 ml-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {notif.time}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm text-center py-4">No new notifications</p>
      )}
    </div>
  );
};

export default NotificationsModal;
