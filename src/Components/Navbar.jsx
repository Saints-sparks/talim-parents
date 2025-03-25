import React, { useState } from "react";
import { CiSearch } from "react-icons/ci";
import { TbCalendarMonth } from "react-icons/tb";
import { IoIosNotificationsOutline, IoIosArrowDown } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import logo from "/public/ava.svg";

const Navbar = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState("Sandra Eze");
  const [showDropdown, setShowDropdown] = useState(false);

  const wards = ["Sandra Eze", "Michael Eze", "John Eze"];

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    day: "numeric",
    month: "short",
  });

  return (
    <nav className="border-b bg-white w-full">
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
            <button
              onClick={() => navigate("/notifications")}
              className="text-2xl bg-white py-2 px-2 rounded-lg hover:opacity-75 transition-opacity"
            >
              <IoIosNotificationsOutline />
            </button>

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

            {/* Notifications */}
            <button
              onClick={() => navigate("/notifications")}
              className="text-2xl bg-white py-2 px-2 rounded-lg hover:opacity-75 transition-opacity"
            >
              <IoIosNotificationsOutline />
            </button>

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