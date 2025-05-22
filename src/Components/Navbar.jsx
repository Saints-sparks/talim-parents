import React, { useState, useRef, useEffect } from "react";
import { CiSearch } from "react-icons/ci";
import { TbCalendarMonth } from "react-icons/tb";
import { IoIosNotificationsOutline, IoIosArrowDown } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import logo from "/public/ava.svg";
import NotificationsModal from "../Components/NotificationsModal";
import useNotifications from "../hooks/useNotifications"; // Importing the custom hook
import { useParent } from "../hooks/useParents"; // Import your parent hook

const Navbar = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState("Sandra Eze");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const notificationRef = useRef(null);

  // Notifications hook
  const { notifications } = useNotifications();

  // Parent students hook
  const {
    students = [], // Default empty array to prevent undefined
    loading: studentsLoading,
    error: studentsError,
  } = useParent();

  // Filter unread notifications
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadNotifications.length;

  // Create wards array safely
  const wards =
    studentsLoading || studentsError || !Array.isArray(students)
      ? []
      : students.map(
          (student) => `${student.userId.firstName} ${student.userId.lastName}`
        );

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    day: "numeric",
    month: "short",
  });

  // Set default selected ward when students load
  useEffect(() => {
    if (!studentsLoading && wards.length > 0) {
      setSelectedWard(wards[0]);
    }
    if (!studentsLoading && wards.length === 0) {
      setSelectedWard("No wards");
    }
  }, [studentsLoading, wards]);

  // Close modal on outside click
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

  const NotificationButton = () => {
    const handleNotificationClick = (event) => {
      event.stopPropagation();
      setShowModal((prev) => !prev);
    };

    const handleNavigateToNotifications = () => {
      navigate("/notifications");
    };

    return (
      <div className="relative" ref={notificationRef}>
        <button
          onClick={(event) => {
            handleNotificationClick(event);
            handleNavigateToNotifications();
          }}
          className="relative text-2xl bg-white py-2 px-2 rounded-lg hover:opacity-75 transition-opacity"
        >
          <IoIosNotificationsOutline />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        {showModal && (
          <div className="fixed sm:absolute top-16 right-0 sm:right-0 z-[999] w-full sm:w-80 bg-white border shadow-lg rounded-lg">
            <NotificationsModal
              closeModal={() => setShowModal(false)}
              unreadNotifications={unreadNotifications}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="border-b bg-white w-full relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Desktop View */}
        <div className="hidden sm:flex items-center justify-between w-full">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <CiSearch className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </span>
          </div>

          {/* Calendar, Notifications, Profile */}
          <div className="flex items-center space-x-4">
            <div className="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2">
              <span className="text-[#6f6f6f]">{currentDate}</span>
              <TbCalendarMonth className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </div>

            <NotificationButton />

            <div className="flex items-center space-x-4">
              <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-75 transition-opacity">
                <img src={logo} alt="User Avatar" className="w-full h-full object-cover" />
              </button>

              {/* Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex gap-2 items-center"
                >
                  <p className="text-[#434343]">{selectedWard}</p>
                  <IoIosArrowDown />
                </button>

                {showDropdown && (
                  <ul className="absolute top-10 left-0 bg-white border rounded-md shadow-md w-40 py-1 z-10">
                    {wards.length > 0 ? (
                      wards.map((ward, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            setSelectedWard(ward);
                            setShowDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          {ward}
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-2 text-sm text-gray-500">
                        {studentsLoading ? "Loading wards..." : "No wards available"}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View (unchanged) */}
        <div className="sm:hidden flex flex-col">
          {/* Calendar, Notifications, Profile */}
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2">
              <span className="text-[#6f6f6f]">{currentDate}</span>
              <TbCalendarMonth className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </div>

            <NotificationButton />

            <div className="flex items-center space-x-4">
              <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-75 transition-opacity">
                <img src={logo} alt="User Avatar" className="w-full h-full object-cover" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex gap-2 items-center"
                >
                  <p className="text-[#434343]">{selectedWard}</p>
                  <IoIosArrowDown />
                </button>

                {showDropdown && (
                  <ul className="absolute top-10 left-0 bg-white border rounded-md shadow-md w-40 py-1 z-10">
                    {wards.length > 0 ? (
                      wards.map((ward, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            setSelectedWard(ward);
                            setShowDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          {ward}
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-2 text-sm text-gray-500">
                        {studentsLoading ? "Loading wards..." : "No wards available"}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="relative w-full order-last">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <CiSearch className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
