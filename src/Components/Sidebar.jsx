import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RiHome5Line } from "react-icons/ri";
import { PiCalendarDotsLight } from "react-icons/pi";
import { SlBadge } from "react-icons/sl";
import { TbMessageDots } from "react-icons/tb";
import { IoMdNotificationsOutline, IoMdTime } from "react-icons/io";
import { CgLogOff } from "react-icons/cg";
import { IoMenu } from "react-icons/io5";
import { IoIosArrowBack } from "react-icons/io";
import { MdOutlinePayments, MdOutlineSettings, MdOutlineFamilyRestroom } from "react-icons/md";
import LeaveRequestIcon from '../lib/ui/LeaveRequestIcon'; 


import logo from "../assets/logo.svg";

import { useAuth } from "../services/auth.services"; // adjust path if needed
import { useSchool } from "../hooks/useSchools";     // import the hook

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const { logout, loading: authLoading, error: authError } = useAuth();
  const { school, loading: schoolLoading, error: schoolError } = useSchool();
  const [isOpen, setIsOpen] = useState(false); // Mobile toggle
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop toggle

  const schoolData = school?.school || school?.data || school || {};
  const schoolName = schoolLoading
    ? "Loading..."
    : schoolError
    ? "Error loading school"
    : schoolData?.name || schoolData?.schoolName || "School Name";
  const schoolLogo = schoolData?.logo || schoolData?.schoolLogo || logo;

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const handleLinkClick = () => {
    if (isMobile) setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: <RiHome5Line className="text-[24px]" /> },
    { path: "/my-children", name: "My Children", icon: <MdOutlineFamilyRestroom className="text-[24px]" /> },
    { path: "/attendance", name: "Attendance", icon: <PiCalendarDotsLight className="text-[24px]" /> },
    { path: "/timetable", name: "Timetable", icon: <IoMdTime className="text-[24px]" /> },
    { path: "/result", name: "Results", icon: <SlBadge className="text-[24px]" /> },
    { path: "/requestleave", name: "Leave Requests", icon: <LeaveRequestIcon className="text-[24px]" /> },
    { path: "/messages", name: "Messages", icon: <TbMessageDots className="text-[24px]" /> },
    { path: "/notifications", name: "Notifications", icon: <IoMdNotificationsOutline className="text-[24px]" /> },
    { path: "/payments", name: "Payments", icon: <MdOutlinePayments className="text-[24px]" /> },
    { path: "/settings", name: "Settings", icon: <MdOutlineSettings className="text-[24px]" /> },
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      {isMobile && !isOpen && (
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md"
          onClick={() => setIsOpen(true)}
          aria-label="Open sidebar menu"
        >
          <IoMenu size={24} className="text-[#003366]" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          ${isMobile ? "fixed left-0 top-0 z-[60]" : "sticky top-0 z-30"}
          ${isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"}
          ${isCollapsed ? "w-20" : "w-64"}
          flex flex-col justify-between min-h-screen bg-white shadow-lg
          transition-transform duration-300 ease-in-out
        `}
        aria-label="Sidebar navigation"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b p-3 dark:border-[#2a3a5a]">
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <img src={logo} alt="Talim Logo" className="h-11 w-11 rounded-xl" />
            {!isCollapsed && (
              <span className="text-xl font-bold text-[#030E18] dark:text-slate-100">
                Talim
              </span>
            )}
          </div>
          {!isMobile && (
            <button
              className="rounded-md border border-gray-300 p-2 dark:border-[#2a3a5a]"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <IoIosArrowBack
                size={20}
                className={`text-[#003366] transition-transform ${
                  isCollapsed ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          )}
          {isMobile && isOpen && (
            <button
              className="rounded-md p-2"
              onClick={() => setIsOpen(false)}
              aria-label="Close sidebar menu"
            >
              <div className="border-[#003366] border-2 rounded-lg p-1">
                <IoIosArrowBack size={20} className="text-[#003366]" />
              </div>
            </button>
          )}
        </div>

        {/* School Name & Logo */}
        {!isCollapsed && (
          <button className="m-3 flex min-h-[64px] w-[calc(100%_-_1.5rem)] items-center justify-center gap-3 rounded-[10px] border bg-[#fbfbfb] px-3 py-3 dark:border-[#2a3a5a] dark:bg-[#152238]">
            <img
              src={schoolLogo}
              alt={schoolName}
              className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = logo;
              }}
            />
            <p className="min-w-0 text-center text-sm font-semibold text-[#030E18] dark:text-slate-100">
              {schoolName}
            </p>
          </button>
        )}

        {/* Navigation Menu */}
        <nav className="flex flex-col flex-grow mt-[10px]" aria-label="Main navigation">
          <ul className="space-y-0">
            {menuItems.map(({ path, name, icon }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center px-6 py-3 m-3 rounded-lg text-gray-700 transition-colors duration-200 ${
                    location.pathname === path ? "bg-[#bfccd8] text-[#184674]" : "hover:bg-gray-50"
                  }`}
                  onClick={handleLinkClick}
                >
                  <span className="mr-3">{icon}</span>
                  {!isCollapsed && name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Section */}
        <div className="border-t border-[#e0e0e0] p-4">
          <div className="flex items-center px-4 gap-3">
            <button
              className="rounded p-1 text-red-600 hover:text-gray-900"
              onClick={handleLogout}
              aria-label="Logout"
              disabled={authLoading}
              title={authLoading ? "Logging out..." : "Logout"}
            >
              <CgLogOff size={20} />
            </button>
            {!isCollapsed && <h3 className="text-sm font-small">Logout Account</h3>}
          </div>
          {authError && <p className="text-red-600 mt-1 text-xs">{authError}</p>}
        </div>
      </aside>

      {/* Content Spacer for Mobile View */}
      {isMobile && <div className="h-16 md:hidden" />}
    </>
  );
}
