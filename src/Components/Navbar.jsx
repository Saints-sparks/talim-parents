import React, { useState, useRef, useEffect } from "react";
import { CiSearch } from "react-icons/ci";
import { TbCalendarMonth } from "react-icons/tb";
import { IoIosNotificationsOutline, IoIosArrowDown } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import logo from "/public/ava.svg";
import NotificationsModal from "../Components/NotificationsModal";
import useNotifications from "../hooks/useNotifications";
import { useParent } from "../hooks/useParents";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";

const Navbar = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const notificationRef = useRef(null);

  const { notifications } = useNotifications();
  const {
    students = [],
    loading: studentsLoading,
    error: studentsError,
  } = useParent();
  const { updateSelectedStudent, selectedStudent } = useSelectedStudent();

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadNotifications.length;

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    day: "numeric",
    month: "short",
  });

  useEffect(() => {
    if (!studentsLoading && students.length > 0) {
      // Set initial selected student (either from localStorage or first student)
      const initialStudent = selectedStudent || students[0];
      updateSelectedStudent(initialStudent);
      setSelectedWard(
        `${initialStudent.userId.firstName} ${initialStudent.userId.lastName}`
      );
    } else if (!studentsLoading && students.length === 0) {
      setSelectedWard("No wards");
    }
  }, [studentsLoading, students, selectedStudent, updateSelectedStudent]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (e) => {
    e.stopPropagation();
    setShowModal((prev) => !prev);
    navigate("/notifications");
  };

  const renderWardDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setShowDropdown((prev) => !prev)}
        className="flex items-center gap-2"
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <p className="text-[#434343]">{selectedWard}</p>
        <IoIosArrowDown />
      </button>

      {showDropdown && (
        <ul className="absolute top-10 left-0 bg-white border rounded-md shadow-md w-40 py-1 z-10">
          {students.length > 0 ? (
            students.map((student, index) => {
              const fullName = `${student.userId.firstName} ${student.userId.lastName}`;
              return (
                <li
                  key={index}
                  onClick={() => {
                    setSelectedWard(fullName);
                    setShowDropdown(false);
                    updateSelectedStudent(student);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {fullName}
                </li>
              );
            })
          ) : (
            <li className="px-4 py-2 text-sm text-gray-500">
              {studentsLoading ? "Loading wards..." : "No wards available"}
            </li>
          )}
        </ul>
      )}
    </div>
  );

  return (
    <nav className="border-b bg-white w-full relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Desktop View */}
        <div className="hidden sm:flex items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <CiSearch className="absolute left-3 top-2.5 text-[#6f6f6f] h-[24px] w-[24px]" />
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            <div className="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2">
              <span className="text-[#6f6f6f]">{currentDate}</span>
              <TbCalendarMonth className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={handleNotificationClick}
                className="relative text-2xl bg-white py-2 px-2 rounded-lg hover:opacity-75 transition-opacity"
                aria-label="Notifications"
              >
                <IoIosNotificationsOutline />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showModal && (
                <div className="fixed sm:absolute top-16 right-0 z-[999] w-full sm:w-80 bg-white border shadow-lg rounded-lg">
                  <NotificationsModal
                    closeModal={() => setShowModal(false)}
                    unreadNotifications={unreadNotifications}
                  />
                </div>
              )}
            </div>

            {/* Avatar + Dropdown */}
            <div className="flex items-center space-x-4">
              <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-75 transition-opacity">
                <img
                  src={logo || "/fallback-avatar.png"}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </button>
              {renderWardDropdown()}
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2">
              <span className="text-[#6f6f6f]">{currentDate}</span>
              <TbCalendarMonth className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleNotificationClick}
                className="relative text-2xl bg-white py-2 px-2 rounded-lg hover:opacity-75 transition-opacity"
              >
                <IoIosNotificationsOutline />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-75 transition-opacity">
                <img
                  src={logo || "/fallback-avatar.png"}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </button>

              {renderWardDropdown()}
            </div>
          </div>

          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <CiSearch className="absolute left-3 top-2.5 text-[#6f6f6f] h-[24px] w-[24px]" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;