export const getChildId = (child) => child?.childId || child?._id || child?.studentId || child?.userId?._id;

export const getChildUserId = (child) => child?.childUserId || child?.userId?._id || child?.userId || child?.childId;

export const getChildName = (child) => {
  const firstName = child?.firstName || child?.userId?.firstName || "";
  const lastName = child?.lastName || child?.userId?.lastName || "";
  return [firstName, lastName].filter(Boolean).join(" ") || "Unnamed child";
};

export const getChildMeta = (child) => {
  const grade = child?.grade || child?.gradeLevel || child?.classId?.gradeLevel;
  const className = child?.className || child?.classId?.name;
  return [grade, className].filter(Boolean).join(" • ") || "Class not assigned";
};

export const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "C";

export const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const formatTimeRange = (slot) => {
  if (!slot) return "";
  return `${slot.startTime || ""} - ${slot.endTime || ""}`.trim();
};
