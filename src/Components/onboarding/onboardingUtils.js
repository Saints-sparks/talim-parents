export const getPersonName = (person) => {
  const user = person?.userId || person || {};
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Not set";
};

export const getStudentClassLabel = (ward) => {
  const className = ward?.classId?.name || ward?.className || "Class not assigned";
  const grade = ward?.gradeLevel || ward?.grade || ward?.classId?.gradeLevel;
  return grade ? `${grade} • ${className}` : className;
};

export const getAvatarUrl = (person) => person?.userId?.userAvatar || person?.userAvatar || "";

export const getInitials = (person) => {
  const user = person?.userId || person || {};
  const first = user.firstName?.[0] || "";
  const last = user.lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "P";
};
