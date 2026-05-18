import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, Check, ChevronDown, LogOut, Plus, Settings, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../hooks/useNotifications";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";
import { useParentOnboarding } from "../contexts/ParentOnboardingContext";
import { useAuth } from "../services/auth.services";
import { Avatar, AvatarFallback, AvatarImage } from "../lib/ui/avatar";

const getStudentName = (student) => {
  const user = student?.userId || {};
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Select child";
};

const getStudentMeta = (student) => {
  const grade = student?.gradeLevel || student?.grade || student?.classId?.gradeLevel;
  const className = student?.classId?.name || student?.className || "Class not assigned";
  return [grade, className].filter(Boolean).join(" • ");
};

const getInitials = (person) => {
  const first = person?.firstName?.[0] || "";
  const last = person?.lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "P";
};

const getStudentId = (student) =>
  student?._id || student?.userId?._id || student?.userId?.userId;

const Navbar = () => {
  const navigate = useNavigate();
  const childDropdownRef = useRef(null);
  const parentDropdownRef = useRef(null);
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  const { notifications } = useNotifications();
  const { wards = [], wardsLoading } = useParentOnboarding();
  const { updateSelectedStudent, selectedStudent } = useSelectedStudent();
  const { user, logout } = useAuth();

  const unreadCount = notifications.filter((n) => n.unread || !n.isRead).length;
  const parentName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Parent",
    [user]
  );
  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    []
  );

  useEffect(() => {
    if (!wardsLoading && wards.length > 0 && !selectedStudent) {
      updateSelectedStudent(wards[0]);
    }
  }, [selectedStudent, updateSelectedStudent, wards, wardsLoading]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (childDropdownRef.current && !childDropdownRef.current.contains(event.target)) {
        setShowChildDropdown(false);
      }
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(event.target)) {
        setShowParentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectChild = (student) => {
    updateSelectedStudent(student);
    setShowChildDropdown(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const selectedId = getStudentId(selectedStudent);

  return (
    <header className="sticky top-0 z-20 border-b border-[#E5EAF2] bg-white">
      <div className="flex min-h-[76px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: child selector + add/switch button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative" ref={childDropdownRef}>
            <button
              type="button"
              onClick={() => setShowChildDropdown((v) => !v)}
              className="flex items-center gap-3 rounded-xl border border-[#DCE5F2] bg-white px-3 py-2 text-left shadow-sm hover:bg-[#F8FAFD]"
              aria-haspopup="true"
              aria-expanded={showChildDropdown}
            >
              <Avatar className="h-10 w-10 shrink-0">
                {selectedStudent?.userId?.userAvatar ? (
                  <AvatarImage
                    src={selectedStudent.userId.userAvatar}
                    alt={getStudentName(selectedStudent)}
                  />
                ) : (
                  <AvatarFallback className="bg-[#EAF2FB] text-sm font-bold text-[#003366]">
                    {getInitials(selectedStudent?.userId)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#101828]">
                  {wardsLoading ? "Loading..." : getStudentName(selectedStudent)}
                </span>
                <span className="block text-xs text-[#667085]">
                  {selectedStudent ? getStudentMeta(selectedStudent) : "No child selected"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#667085]" />
            </button>

            {showChildDropdown && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl border border-[#E5EAF2] bg-white shadow-lg">
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                  Switch Child
                </p>
                <div className="p-1.5 pt-0">
                  {wards.length > 0 ? (
                    wards.map((student) => {
                      const id = getStudentId(student);
                      const isSelected = id && id === selectedId;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSelectChild(student)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F4F8FF]"
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            {student?.userId?.userAvatar ? (
                              <AvatarImage
                                src={student.userId.userAvatar}
                                alt={getStudentName(student)}
                              />
                            ) : (
                              <AvatarFallback className="bg-[#EAF2FB] text-xs font-bold text-[#003366]">
                                {getInitials(student?.userId)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[#101828]">
                              {getStudentName(student)}
                            </span>
                            <span className="block text-xs text-[#667085]">
                              {getStudentMeta(student)}
                            </span>
                          </span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-[#0A4EA3]" />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-2 text-sm text-[#667085]">
                      {wardsLoading ? "Loading children..." : "No linked children"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#344054] shadow-sm hover:bg-[#F8FAFD]"
          >
            <Plus className="h-4 w-4" />
            Add / Switch Child
          </button>
        </div>

        {/* Right: date pill + bell + parent menu */}
        <div className="flex items-center justify-end gap-3">
          <div className="hidden h-10 items-center gap-2 rounded-xl border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#344054] shadow-sm md:flex">
            <span>{currentDate}</span>
            <CalendarDays className="h-4 w-4 text-[#667085]" />
          </div>

          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE5F2] bg-white text-[#344054] shadow-sm hover:bg-[#F8FAFD]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={parentDropdownRef}>
            <button
              type="button"
              onClick={() => setShowParentDropdown((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-[#DCE5F2] bg-white px-3 py-2 shadow-sm hover:bg-[#F8FAFD]"
              aria-haspopup="true"
              aria-expanded={showParentDropdown}
            >
              <Avatar className="h-9 w-9 shrink-0">
                {user?.userAvatar ? (
                  <AvatarImage src={user.userAvatar} alt={parentName} />
                ) : (
                  <AvatarFallback className="bg-[#F5E9E2] text-[#7A4B33]">
                    {user ? getInitials(user) : <UserRound className="h-4 w-4" />}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-bold text-[#101828]">{parentName}</span>
                <span className="block text-xs text-[#667085]">Parent</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-[#667085] sm:block" />
            </button>

            {showParentDropdown && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-xl border border-[#E5EAF2] bg-white shadow-lg">
                {/* Mini profile preview */}
                <div className="flex items-center gap-3 border-b border-[#EEF2F7] px-4 py-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    {user?.userAvatar ? (
                      <AvatarImage src={user.userAvatar} alt={parentName} />
                    ) : (
                      <AvatarFallback className="bg-[#F5E9E2] text-sm font-bold text-[#7A4B33]">
                        {user ? getInitials(user) : "P"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#101828]">{parentName}</p>
                    <p className="text-xs text-[#667085]">Parent Account</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowParentDropdown(false);
                      navigate("/profile");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#344054] hover:bg-[#F8FAFD]"
                  >
                    <UserRound className="h-4 w-4 text-[#667085]" />
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowParentDropdown(false);
                      navigate("/settings");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#344054] hover:bg-[#F8FAFD]"
                  >
                    <Settings className="h-4 w-4 text-[#667085]" />
                    Settings
                  </button>
                  <div className="my-1 h-px bg-[#EEF2F7]" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
