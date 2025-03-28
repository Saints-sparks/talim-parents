import React, { useState, useRef, useEffect } from "react";
import { CiSearch } from "react-icons/ci";
import { TbCalendarMonth } from "react-icons/tb";
import { IoIosNotificationsOutline, IoIosArrowDown } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import logo from "/public/ava.svg";
import { dummyNotifications } from "../data/notifications";
import NotificationsModal from "../Components/NotificationsModal";

const Navbar = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState("Sandra Eze");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false); 
  const [notifications] = useState(dummyNotifications);
  const notificationRef = useRef(null);

  // Filter only unread notifications for the modal
  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadNotifications.length;

  const wards = ["Sandra Eze", "Michael Eze", "John Eze"];

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    day: "numeric",
    month: "short",
  });

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowModal(false);
      }
    };
  
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const NotificationButton = () => {
    const navigate = useNavigate();
  
    const handleNotificationClick = (event) => {
      event.stopPropagation(); // Prevent closing modal immediately when clicking
      setShowModal((prev) => !prev);
    };
  
    const handleNavigateToNotifications = () => {
      navigate("/notifications"); // Change this to the correct route
    };
  
    return (
      <div className="relative" ref={notificationRef}>
        <button
          onClick={(event) => {
            handleNotificationClick(event);
            handleNavigateToNotifications(); // Navigate when clicking the icon
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
        {/* Desktop View - Single Row */}
        <div className="hidden sm:flex items-center justify-between w-full">
          {/* Search Bar (Left) */}
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

          {/* Calendar, Notifications, and Profile (Right) */}
          <div className="flex items-center space-x-4">
            {/* Calendar */}
            <div className="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2">
              <span className="text-[#6f6f6f]">{currentDate}</span>
              <TbCalendarMonth className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </div>

            {/* Notifications */}
            <NotificationButton />

            {/* Profile */}
            <div className="flex items-center space-x-4">
              <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-75 transition-opacity">
                <img
                  src={logo}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
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
                    {wards.map((ward, index) => (
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
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View - Stacked Layout */}
        <div className="sm:hidden flex flex-col">
          {/* Calendar, Notifications, and Profile */}
          <div className="flex items-center justify-between mb-4">
            {/* Calendar */}
            <div className="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2">
              <span className="text-[#6f6f6f]">{currentDate}</span>
              <TbCalendarMonth className="text-[#6f6f6f] h-[24px] w-[24px]" />
            </div>

            <NotificationButton />

            {/* Profile */}
            <div className="flex items-center space-x-4">
              <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-75 transition-opacity">
                <img
                  src={logo}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
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
                    {wards.map((ward, index) => (
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
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar (Full Width, Bottom) */}
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