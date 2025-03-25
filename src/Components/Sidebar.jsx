import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RiHome5Line } from "react-icons/ri";
import { BsHandbag } from "react-icons/bs";
import { PiCalendarDotsLight } from "react-icons/pi";
import { SlBadge } from "react-icons/sl";
import { TbMessageDots } from "react-icons/tb";
import { IoMdTime } from "react-icons/io";
import { CgLogOff } from "react-icons/cg";
import { IoMenu } from "react-icons/io5";
import { IoIosArrowBack } from "react-icons/io";

import logo from '../images/1.png';

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);  // Mobile toggle
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop toggle

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleLinkClick = () => {
    if (isMobile) setIsOpen(false);
  };

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <RiHome5Line className='text-[24px]'/> },
    { path: '/timetable', name: 'Timetable', icon: <IoMdTime className='text-[24px]'/> },
    { path: '/attendance', name: 'Attendance', icon: <PiCalendarDotsLight className='text-[24px]'/> },
    { path: '/requestleave', name: 'Request leave', icon: <BsHandbag className='text-[24px]'/> },
    { path: '/result', name: 'Results', icon: <SlBadge className='text-[24px]'/> },
    { path: '/messages', name: 'Messages', icon: <TbMessageDots className='text-[24px]'/> },
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      {isMobile && !isOpen && (
        <button 
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md"
          onClick={() => setIsOpen(true)}
        >
          <IoMenu size={24} className='text-[#003366]' />
        </button>
      )}

      {/* Mobile Overlay when sidebar is open */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

<div 
  className={`
    ${isMobile ? 'fixed left-0 top-0 z-[60]' : 'sticky top-0 z-30'} 
    ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
    ${isCollapsed ? 'w-20' : 'w-64'} 
    flex flex-col justify-between min-h-screen bg-white shadow-lg
    transition-all duration-300 ease-in-out
  `}
>

  {/* Sidebar Header */}
  <div className="p-3 border-b flex items-center justify-between">
    {!isCollapsed && <img src={logo} alt="Logo" className="h-12 w-auto" />}
    {!isMobile && (
      <button 
        className="p-2 rounded-md border border-gray-300"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <IoIosArrowBack size={20} className={`text-[#003366] transition-transform ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
      </button>
    )}
    {isMobile && isOpen && (
      <button className="p-2 rounded-md" onClick={() => setIsOpen(false)}>
        <div className='border-[#003366] border-[2px] rounded-lg p-1'>
          <IoIosArrowBack size={20} className='text-[#003366]' />
        </div>
      </button>
    )}
  </div>

  {/* School Name */}
  {!isCollapsed && (
    <button className='flex bg-[#fbfbfb] justify-center gap-1 items-center rounded-[10px] border m-3 px-[1px] py-[3px] w-[227px]'>
      <img src="/6.svg" alt="" />
      <p>Unity Secondary School</p>
    </button>
  )}

  {/* Navigation Menu */}
  <div className="flex flex-col flex-grow">
    <nav className="mt-[10px]">
      <ul className="space-y-0">
        {menuItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center px-6 py-3 text-gray-700 transition-colors duration-200 ${
                location.pathname === item.path
                  ? 'bg-[#bfccd8] m-3 rounded-lg text-[#184674]'
                  : 'hover:bg-gray-50 m-3 rounded-lg'
              }`}
              onClick={handleLinkClick}
            >
              <span className="mr-3">{item.icon}</span>
              {!isCollapsed && item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </div>

  {/* Logout Section */}
  <div className="border-t border-[#e0e0e0] p-4">
    <div className="flex items-center px-4 gap-3">
      <button className="rounded p-1 text-red-600 hover:text-gray-900">
        <CgLogOff size={20} />
      </button>
      {!isCollapsed && <h3 className="text-sm font-small">LogOut Account</h3>}
    </div>
  </div>
</div>

      {/* Content Spacer for Mobile View */}
      {isMobile && <div className="h-16 md:hidden"></div>}
    </>
  );
}
