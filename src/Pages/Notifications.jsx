import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquareText,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import useNotifications from "../hooks/useNotifications";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";
import { cn } from "../lib/utils";

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "announcement", label: "Announcements" },
  { key: "attendance", label: "Attendance" },
  { key: "payments", label: "Fee & Payments" },
];

const CATEGORY_META = {
  announcement: {
    label: "Announcement",
    dot: "bg-blue-600",
    badge: "bg-blue-50 text-blue-700",
    iconWrap: "bg-blue-50 text-blue-700",
    Icon: Megaphone,
  },
  attendance: {
    label: "Attendance",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    iconWrap: "bg-emerald-50 text-emerald-700",
    Icon: CalendarCheck,
  },
  academics: {
    label: "Academics",
    dot: "bg-violet-600",
    badge: "bg-violet-50 text-violet-700",
    iconWrap: "bg-violet-50 text-violet-700",
    Icon: BookOpen,
  },
  grading: {
    label: "Results",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
    iconWrap: "bg-amber-50 text-amber-700",
    Icon: GraduationCap,
  },
  payments: {
    label: "Fee & Payments",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    iconWrap: "bg-emerald-50 text-emerald-700",
    Icon: CreditCard,
  },
  event: {
    label: "Event",
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700",
    iconWrap: "bg-purple-50 text-purple-700",
    Icon: CalendarDays,
  },
  messages: {
    label: "Messages",
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700",
    iconWrap: "bg-sky-50 text-sky-700",
    Icon: MessageSquareText,
  },
  resources: {
    label: "Resources",
    dot: "bg-cyan-500",
    badge: "bg-cyan-50 text-cyan-700",
    iconWrap: "bg-cyan-50 text-cyan-700",
    Icon: FileText,
  },
  account: {
    label: "Account",
    dot: "bg-slate-500",
    badge: "bg-slate-50 text-slate-700",
    iconWrap: "bg-slate-50 text-slate-700",
    Icon: Bell,
  },
  other: {
    label: "Notification",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700",
    iconWrap: "bg-orange-50 text-orange-700",
    Icon: Bell,
  },
};

const formatTime = (dateString) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

function Notifications() {
  const {
    notifications,
    loading,
    error,
    counts,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const { selectedStudent } = useSelectedStudent();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "unread"
          ? notification.unread
          : notification.category === activeTab;

      const matchesSearch = query
        ? [
            notification.title,
            notification.message,
            notification.senderName,
            notification.sourceLabel,
            CATEGORY_META[notification.category]?.label,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;

      return matchesTab && matchesSearch;
    });
  }, [activeTab, notifications, searchQuery]);

  useEffect(() => {
    if (!filteredNotifications.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredNotifications.some((item) => item.id === selectedId)) {
      setSelectedId(filteredNotifications[0].id);
    }
  }, [filteredNotifications, selectedId]);

  const selectedNotification =
    filteredNotifications.find((item) => item.id === selectedId) ||
    filteredNotifications[0] ||
    null;

  const handleSelect = (notification) => {
    setSelectedId(notification.id);
    setShowDetail(true);
    if (notification.unread) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="h-full min-h-[calc(100vh-112px)] overflow-hidden bg-[#F7F9FC]">
      <div className="grid h-full min-h-[calc(100vh-112px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_430px]">
        <section
          data-guide="notifications-list"
          className={cn(
            "flex min-h-0 flex-col border-r border-[#E5EAF2] bg-white",
            showDetail && selectedNotification ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="border-b border-[#E5EAF2] px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div data-guide="notifications-header">
                <h1 className="text-2xl font-bold text-[#101828]">Notifications</h1>
                <p className="mt-2 text-sm text-[#667085]">
                  Stay updated with all important announcements and alerts.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={markAllAsRead}
                  disabled={!counts.unread}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#F7F9FB] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark all as read
                </button>
                <button
                  onClick={refetch}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE5F2] bg-white text-[#344054] hover:bg-[#F7F9FB]"
                  aria-label="Refresh notifications"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Tabs activeTab={activeTab} counts={counts} onChange={setActiveTab} />

            <div data-guide="notifications-search-sort" className="mt-5 flex h-11 max-w-md items-center rounded-lg border border-[#DCE5F2] bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="mr-2 h-5 w-5 text-[#8A95A5]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search notifications..."
                className="h-full flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[#8A95A5]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <X className="h-4 w-4 text-[#8A95A5]" />
                </button>
              )}
            </div>
          </div>

          <NotificationList
            notifications={filteredNotifications}
            selectedId={selectedNotification?.id}
            loading={loading}
            error={error}
            totalCount={notifications.length}
            onSelect={handleSelect}
            onRetry={refetch}
          />
        </section>

        <aside
          data-guide="notifications-detail"
          className={cn(
            "min-h-0 bg-white",
            showDetail && selectedNotification ? "flex" : "hidden lg:flex"
          )}
        >
          <NotificationDetail
            notification={selectedNotification}
            selectedStudent={selectedStudent}
            onBack={() => setShowDetail(false)}
            onMarkAsRead={() => selectedNotification && markAsRead(selectedNotification.id)}
            onDelete={() => {
              if (!selectedNotification) return;
              deleteNotification(selectedNotification.id);
              setShowDetail(false);
            }}
          />
        </aside>
      </div>
    </div>
  );
}

function Tabs({ activeTab, counts, onChange }) {
  return (
    <div data-guide="notifications-tabs" className="mt-5 overflow-x-auto rounded-lg border border-[#E5EAF2] bg-white">
      <div className="grid min-w-[650px] grid-cols-5">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "flex h-12 items-center justify-center gap-2 border-r border-[#EEF2F7] px-4 text-sm font-semibold last:border-r-0",
                active ? "border-b-2 border-b-blue-600 text-blue-700" : "text-[#344054] hover:bg-[#F8FAFD]"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  active ? "bg-blue-600 text-white" : "bg-[#EEF2F7] text-[#667085]"
                )}
              >
                {counts[tab.key] || 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NotificationList({ notifications, selectedId, loading, error, totalCount, onSelect, onRetry }) {
  if (loading && !notifications.length) {
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center text-[#667085]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#003366]" />
          <p className="mt-3 text-sm">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error && !notifications.length) {
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-red-100 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={onRetry}
            className="mt-4 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center p-6 text-center">
        <div>
          <Bell className="mx-auto h-10 w-10 text-[#98A2B3]" />
          <p className="mt-3 font-semibold text-[#101828]">No notifications found</p>
          <p className="mt-1 text-sm text-[#667085]">Try another filter or search term.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            selected={notification.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#E8EDF5] px-4 py-3 text-xs text-[#667085]">
        <span>
          Showing 1 to {notifications.length} of {totalCount} notifications
        </span>
        <div className="flex gap-2">
          <button className="rounded-lg border border-[#DCE5F2] px-3 py-2 text-[#98A2B3]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="rounded-lg border border-blue-500 px-3 py-2 font-semibold text-blue-700">1</button>
          <button className="rounded-lg border border-[#DCE5F2] px-3 py-2 text-[#344054]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationRow({ notification, selected, onSelect }) {
  const meta = CATEGORY_META[notification.category] || CATEGORY_META.other;
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        "grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-[#EEF2F7] px-4 py-4 text-left transition hover:bg-[#F8FBFF]",
        selected && "bg-[#F4F8FF] ring-1 ring-inset ring-[#8EBBFF]"
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", notification.unread ? meta.dot : "bg-[#D0D5DD]")} />
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl", meta.iconWrap)}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[#101828]">{notification.title}</span>
        <span className="mt-1 line-clamp-2 block text-sm leading-5 text-[#475467]">{notification.message}</span>
        <span className={cn("mt-2 inline-flex rounded px-2 py-0.5 text-xs font-semibold", meta.badge)}>
          {meta.label}
        </span>
      </span>
      <span className="flex items-center gap-5">
        <span className="hidden text-right text-xs text-[#475467] sm:block">
          <span className={cn("mb-1 block h-2 w-2 rounded-full", notification.unread ? "bg-blue-600" : "bg-transparent")} />
          <span className="block">{formatTime(notification.createdAt)}</span>
          <span className="block">{formatDate(notification.createdAt)}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-[#667085]" />
      </span>
    </button>
  );
}

function NotificationDetail({ notification, selectedStudent, onBack, onMarkAsRead, onDelete }) {
  if (!notification) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <Bell className="mx-auto h-10 w-10 text-[#98A2B3]" />
          <p className="mt-3 font-semibold text-[#101828]">Select a notification</p>
          <p className="mt-1 text-sm text-[#667085]">Choose an update from the list to read details.</p>
        </div>
      </div>
    );
  }

  const meta = CATEGORY_META[notification.category] || CATEGORY_META.other;
  const Icon = meta.Icon;
  const child = selectedStudent?.userId;
  const childName = child ? `${child.firstName || ""} ${child.lastName || ""}`.trim() : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[#E8EDF5] px-5 py-4">
        <span className={cn("rounded px-3 py-1 text-xs font-semibold", meta.badge)}>{meta.label}</span>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE5F2] text-[#667085] hover:bg-[#F7F9FB]"
          aria-label="Close detail"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <h2 className="text-xl font-bold leading-7 text-[#101828]">{notification.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#475467]">
          <span>{formatTime(notification.createdAt)}</span>
          <span>•</span>
          <span>{formatDate(notification.createdAt)}</span>
          {notification.unread && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Unread
              </span>
            </>
          )}
        </div>

        <div className="mt-5 flex h-40 items-center justify-center rounded-lg bg-gradient-to-br from-[#EAF3FF] via-[#F5F9FF] to-[#EAF3FF] text-blue-700">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Icon className="h-10 w-10" />
            </div>
            <div className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-[#344054]">
          {notification.message.split("\n").map((line, index) => (
            <p key={`${notification.id}-${index}`}>{line}</p>
          ))}
        </div>

        <div className="mt-5 space-y-3 text-sm text-[#344054]">
          {notification.metadata?.date && (
            <DetailLine icon={<CalendarDays className="h-4 w-4" />} label="Date" value={notification.metadata.date} />
          )}
          {notification.metadata?.time && (
            <DetailLine icon={<Clock className="h-4 w-4" />} label="Time" value={notification.metadata.time} />
          )}
          {notification.metadata?.venue && (
            <DetailLine icon={<MapPin className="h-4 w-4" />} label="Venue" value={notification.metadata.venue} />
          )}
        </div>

        <div className="mt-6 border-t border-[#E8EDF5] pt-5">
          <p className="text-xs font-semibold text-[#667085]">Related Child</p>
          <div className="mt-3 inline-flex items-center gap-3 rounded-lg bg-[#F8FAFD] px-3 py-2">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-[#EAF2FB]">
              {child?.userAvatar ? (
                <img src={child.userAvatar} alt={childName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#003366]">
                  {(child?.firstName?.[0] || "C") + (child?.lastName?.[0] || "")}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-[#101828]">{childName || "Selected ward"}</p>
              <p className="text-xs text-[#667085]">{selectedStudent?.classId?.name || "Class not assigned"}</p>
            </div>
          </div>
        </div>

        {notification.attachments.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-bold text-[#101828]">Attachments ({notification.attachments.length})</p>
            <div className="mt-3 space-y-2">
              {notification.attachments.map((attachment, index) => (
                <a
                  key={`${attachment}-${index}`}
                  href={attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[#E5EAF2] bg-white p-3 hover:bg-[#F8FBFF]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#101828]">
                        {attachment.split("/").pop() || `Attachment ${index + 1}`}
                      </span>
                      <span className="text-xs text-[#667085]">PDF • Download</span>
                    </span>
                  </span>
                  <Download className="h-5 w-5 text-[#667085]" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-[#E8EDF5] p-5">
        <button
          onClick={onMarkAsRead}
          disabled={!notification.unread}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] text-sm font-semibold text-[#344054] hover:bg-[#F7F9FB] disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Mark as read
        </button>
        <button
          onClick={onDelete}
          className="inline-flex h-11 w-12 items-center justify-center rounded-lg border border-[#DCE5F2] text-[#344054] hover:bg-[#F7F9FB]"
          aria-label="Delete notification"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DetailLine({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#667085]">{icon}</span>
      <span className="font-semibold text-[#475467]">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export default Notifications;
