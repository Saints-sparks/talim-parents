import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications"; // your hook
import { toast } from "react-hot-toast";

function Notifications() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Use your notifications hook
  const { notifications, isLoading } = useNotifications();

  // Flatten notifications data array safely
  const allNotifications = notifications?.data || [];

  // Compute unread notifications count
  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !n.readBy || n.readBy.length === 0).length;
  }, [allNotifications]);

  // Filter notifications by filter state
  const filteredByRead = useMemo(() => {
    if (filter === "unread") {
      return allNotifications.filter((n) => !n.readBy || n.readBy.length === 0);
    }
    return allNotifications;
  }, [allNotifications, filter]);

  // Search filter (case insensitive match on title, message or senderId.email)
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return filteredByRead;

    const lowerQuery = searchQuery.toLowerCase();
    return filteredByRead.filter((n) => {
      const titleMatch = n.title?.toLowerCase().includes(lowerQuery);
      const messageMatch = n.message?.toLowerCase().includes(lowerQuery);
      const senderEmail = n.senderId?.email || "";
      const senderMatch = senderEmail.toLowerCase().includes(lowerQuery);
      return titleMatch || messageMatch || senderMatch;
    });
  }, [filteredByRead, searchQuery]);

  // Stub for marking all as read - implement your API call here
  const markAllAsRead = async () => {
    try {
      // Example: await notificationService.markAllRead(accessToken);
      toast.success("All notifications marked as read!");
      // Optionally refresh notifications here after marking read
    } catch (error) {
      toast.error("Failed to mark notifications as read.");
    }
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
              disabled={isLoading}
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
            disabled={isLoading || unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center text-gray-500">Loading notifications...</div>
        )}

        {/* Notification List */}
        <div className="space-y-2">
          {!isLoading && filteredNotifications.length === 0 && (
            <div className="text-center text-gray-500">No notifications found.</div>
          )}

          {filteredNotifications.map((notification) => (
            <Link to={`/notifications/${notification._id}`} key={notification._id} className="block">
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-2 sm:gap-4 items-center bg-white p-2 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                {/* Profile Icon */}
                <div className="col-span-1 flex justify-center">
                  <img
                    src={notification.senderId?.profilePicture || "/default-profile.png"}
                    alt={notification.senderId?.email || "Sender"}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                  />
                </div>

                {/* Sender Name */}
                <div className="col-span-3 sm:col-span-2 truncate">
                  <span className={`text-xs sm:text-sm ${notification.readBy?.length ? "text-gray-600" : "font-medium text-gray-900"}`}>
                    {notification.senderId?.email || "Unknown Sender"}
                  </span>
                </div>

                {/* Title and Message */}
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

                {/* Time */}
                <div className="col-span-2 sm:col-span-2 text-right">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(notification.createdAt).toLocaleString()}
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
