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
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile based on window width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Close sidebar when clicking a link on mobile
  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <RiHome5Line className='text-[24px]'/> },
    { path: '/timetable', name: 'Timetable', icon: <IoMdTime className='text-[24px]'/> },
    { path: '/attendance', name: 'Attendance', icon: <PiCalendarDotsLight className='text-[24px]'/> },
    { path: '/requestleave', name: 'Request leave', icon: <BsHandbag className='text-[24px]'/> },
    { path: '/result', name: 'Results', icon: <SlBadge className='text-[24px]'/> },
    { path: '/messages', name: 'Messages', icon: <TbMessageDots className='text-[24px]'/> },
  ];

  // Hamburger button (only shows when sidebar is closed)
  const HamburgerButton = () => (
    <button 
      className="md:hidden fixed top-4 left-4 z-50  p-2 rounded-md "
      onClick={() => setIsOpen(true)}
    >
      <IoMenu size={24} className='text-[#003366]' />
    </button>
  );

  return (
    <>
      {/* Only show hamburger button when sidebar is closed */}
      {isMobile && !isOpen && <HamburgerButton />}
      
      {/* Overlay for mobile when sidebar is open */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar - fixed on mobile, static on desktop */}
      <div 
        className={`
          ${isMobile ? 'fixed left-0 top-0 z-40' : 'sticky top-0'} 
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
          w-64 flex flex-col gap-5 justify-between h-screen bg-white shadow-lg
          transition-transform duration-300 ease-in-out
        `}
      >
        <div>
          {/* Logo Section with Back Button on right */}
          <div className="p-3 border-b flex items-center justify-between">
            <img src={logo} alt="Logo" className="h-12 w-auto" />
            {/* Back button positioned to the right of logo (only visible when sidebar is open) */}
            {isMobile && isOpen && (
              <button 
                className="p-2 rounded-md"
                onClick={() => setIsOpen(false)}
              >
                <div  className='border-[#003366] border-[2px] rounded-lg p-1'>
                <IoIosArrowBack size={20} className='text-[#003366]' />
                </div>
                
              </button>
            )}
          </div>
          <button className='flex bg-[#fbfbfb] justify-center gap-1 items-center rounded-[10px] border m-3 px-[1px] py-[3px] w-[227px]'>
            <img src="/6.svg" alt="" />
            <p>Unity Secondary School</p>
          </button>

          {/* Navigation Menu */}
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
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Logout section */}
        <div className="border-t border-[#e0e0e0] p-4 mt-10">
          <div className="flex items-center px-4 gap-3">
            <button className="rounded p-1 text-gray-600 hover:text-gray-900">
              <CgLogOff size={20} />
            </button>
            <div className="">
              <h3 className="text-sm font-small">LogOut Account</h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content spacer for mobile view */}
      {isMobile && (
        <div className="h-16 md:hidden"></div>
      )}
    </>
  );
}