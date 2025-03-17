import React from 'react';
import { CiSearch } from "react-icons/ci";
import { TbCalendarMonth } from "react-icons/tb";
import { IoIosNotificationsOutline, IoIosArrowDown } from "react-icons/io";
import logo from '/public/ava.svg';  
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    day: 'numeric',
    month: 'short',
  });

  return (
    <nav className="border-b px-9 py-4">
      <div className="flex flex-col sm:flex-row-reverse items-center sm:justify-between gap-4">
        
        {/* Right Side - Icons & Profile (Now Always on Top on Mobile) */}
        <div className="flex items-center space-x-4">
          {/* Date */}
          <div className="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2">
            <span className="text-[#6f6f6f]">{currentDate}</span>
            <TbCalendarMonth className="text-[#6f6f6f] h-[24px] w-[24px]" />
          </div>

          {/* Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            className="text-2xl bg-white py-2 px-2 rounded-lg hover:opacity-75 transition-opacity">
            <IoIosNotificationsOutline />
          </button>
          
          {/* Divider */}
          <div className="h-6 w-px bg-gray-300" />

          {/* User Avatar */}
          <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-75 transition-opacity">
            <img src={logo} alt="User Avatar" className="w-full h-full object-cover" />
          </button>

          {/* User Name & Dropdown */}
          <button className="flex gap-2 items-center">
            <p className="text-[#434343]">Sandra Eze</p>
            <IoIosArrowDown />
          </button>
        </div>

        {/* Search Bar (Always Below Icons on Mobile) */}
        <div className="relative flex-1 max-w-md w-full sm:mt-0 mt-4">
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
    </nav>
  );
};

export default Navbar;
