/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";

const formatRoomTime = (room) => {
  const value = room?.lastMessage?.createdAt || room?.updatedAt;
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};

const getPreview = (room) => {
  const lastMessage = room?.lastMessage;
  if (!lastMessage) return "No messages yet";
  if (lastMessage.content) return lastMessage.content;
  const attachment = lastMessage.attachments?.[0];
  if (!attachment) return "Attachment";
  const type = typeof attachment === "string" ? "file" : attachment.type;
  if (type === "image") return "Photo";
  if (type === "audio") return "Voice message";
  return "Attachment";
};

function MessagesSidebar({
  rooms = [],
  selectedRoomId,
  onSelectRoom,
  isLoading,
  isConnected,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesFilter =
        selectedFilter === "all" ||
        (selectedFilter === "unread" && room.unreadCount > 0) ||
        (selectedFilter === "groups" && room.isGroup);
      const matchesSearch =
        !term ||
        room.displayName?.toLowerCase().includes(term) ||
        getPreview(room).toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [rooms, searchTerm, selectedFilter]);

  const totalUnread = rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);

  return (
    <aside className="h-full w-full border-r border-[#E5EAF2] bg-white">
      <div className="border-b border-[#E5EAF2] px-4 pb-4 pt-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#101828]">Messages</h2>
            <p className="text-sm text-[#667085]">
              {isConnected ? "Communicate with teachers and school staff." : "Connecting to chat..."}
            </p>
          </div>
          <span className="rounded-full bg-[#EAF2FB] px-2.5 py-1 text-xs font-semibold text-[#0A4EA3]">
            {totalUnread}
          </span>
        </div>

        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#DCE5F2] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#98A2B3]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search messages..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-[#DCE5F2] p-2 text-[#667085]"
            title="Filter messages"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["all", "All"],
            ["unread", `Unread${totalUnread ? ` ${totalUnread}` : ""}`],
            ["groups", "Groups"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedFilter(key)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                selectedFilter === key
                  ? "border-[#D9E8FF] bg-[#EAF2FB] text-[#0A4EA3]"
                  : "border-[#E5EAF2] bg-white text-[#667085] hover:bg-[#F8FAFD]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[calc(100%-176px)] overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl bg-[#F2F4F7]" />
            ))}
          </div>
        ) : filteredRooms.length ? (
          filteredRooms.map((room) => (
            <button
              key={room.roomId}
              type="button"
              onClick={() => onSelectRoom(room.roomId)}
              className={`mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                selectedRoomId === room.roomId ? "bg-[#EAF2FB]" : "hover:bg-[#F8FAFD]"
              }`}
            >
              {room.avatarInfo?.type === "image" ? (
                <img
                  src={room.avatarInfo.value}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: room.avatarInfo?.bgColor || "#0A4EA3" }}
                >
                  {room.avatarInfo?.value || "U"}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-[#101828]">{room.displayName}</span>
                  <span className="shrink-0 text-xs text-[#667085]">{formatRoomTime(room)}</span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-[#667085]">{getPreview(room)}</span>
                  {room.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0A4EA3] px-1.5 text-xs font-bold text-white">
                      {room.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-4 py-12 text-center text-sm text-[#667085]">No conversations found.</div>
        )}
      </div>
    </aside>
  );
}

export default MessagesSidebar;
