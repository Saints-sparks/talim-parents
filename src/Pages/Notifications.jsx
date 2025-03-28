import React, { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { dummyNotifications } from "../data/notifications";

function Notifications() {
  const [notifications, setNotifications] = useState(dummyNotifications);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    const matchesFilter = filter === "all" || (filter === "unread" && !n.isRead);
    const matchesSearch =
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.sender.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-white border-b">
        <h1 className="text-xl font-semibold">Notifications</h1>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center justify-center gap-2 text-gray-600 px-4 py-2 border rounded-lg">
            Recent
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 mb-6">
          <div className="flex gap-3 sm:gap-6">
            <button
              onClick={() => setFilter("all")}
              className={`text-sm ${filter === "all" ? "text-blue-600 font-medium" : "text-gray-500"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`text-sm ${filter === "unread" ? "text-blue-600 font-medium" : "text-gray-500"}`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <button 
            onClick={markAllAsRead} 
            className="text-sm text-blue-600 font-medium sm:ml-auto"
          >
            Mark all as read
          </button>
        </div>

        {/* Notification List */}
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <Link to={`/notifications/${notification.id}`} key={notification.id} className="block">
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-2 sm:gap-4 items-center bg-white p-2 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                {/* Profile Icon - Always visible */}
                <div className="col-span-1 flex justify-center">
                  <img
                    src={notification.senderProfile}
                    alt={notification.sender}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                  />
                </div>

                {/* Sender Name - Full width on mobile, 3 cols on desktop */}
                <div className="col-span-3 sm:col-span-2 truncate">
                  <span className={`text-xs sm:text-sm ${notification.isRead ? "text-gray-600" : "font-medium text-gray-900"}`}>
                    {notification.sender}
                  </span>
                </div>

                {/* Title and Message - Responsive columns with truncation */}
                <div className="col-span-4 sm:col-span-7 min-w-0">
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 truncate">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                      {notification.title}:
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600 truncate">
                      {notification.message}
                    </span>
                  </div>
                </div>

                {/* Time - Right-aligned */}
                <div className="col-span-2 sm:col-span-2 text-right">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {notification.time}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Notifications;