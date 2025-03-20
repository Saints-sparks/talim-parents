import React from 'react';
import { useState, useEffect } from "react";
import { LuArrowUp, LuArrowDown } from "react-icons/lu";
import { IoIosArrowDown } from "react-icons/io";
import AttendanceCalendar from '../Components/AttendanceCalendar ';

const boxes = [
  {
    number: 15,
    text: "Subjects Enrolled",
  },
  {
    number: "85%",
    text: "Grade Score",
    percentage: '15%',
    icon: <LuArrowUp className="text-green-600" />,
    color: 'bg-[#e5ebf0]'
  },
  {
    number: "85%",
    text: "Attendance Percentage",
    percentage: '15%',
    icon: <LuArrowDown className="text-red-600" />,
    color: 'bg-[#F5EBEB]'
  }
];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = Array.from({ length: 5 }, (_, i) => 2021 + i); // Next 10 years

function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [selectedYear, setSelectedYear] = useState(2025);
  const [openDropdown, setOpenDropdown] = useState(null);

   // Close dropdown when clicking outside
   useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  return (
    
<div className="flex w-full min-h-screen p-4 md:p-6 flex-col gap-5 md:gap-8">

{/* Dashboard Overview & Attendance Wrapper */}
<div className="w-full max-w-screen-lg mx-auto p-4 md:p-6 rounded-lg flex flex-col gap-6">

  {/* Overview Section */}
  <div className="w-full">
    <h1 className="text-[18px] md:text-[22px] font-semibold mb-3">Overview</h1>
    
    {/* Stats Boxes */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[5px] md:gap-[8px]">
      {boxes.map((box, index) => (
        <div
          key={index}
          className="w-1/2 sm:w-full flex flex-col justify-between h-[90px] bg-white p-2 rounded-lg shadow-xs hover:shadow-sm hover:shadow-[#003366] transition-shadow"
        >
          <div>
            <p className="text-gray-500 text-xs md:text-sm">{box.text}</p>
            <h2 className="text-[18px] md:text-[24px] font-semibold">{box.number}</h2>
          </div>
          {box.percentage && (
            <div
              className={`flex items-center ${box.color} gap-1 px-2 py-1 h-[20px] rounded-md self-end text-xs`}
            >
              {box.icon} {box.percentage}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>

  {/* Attendance Section */}
  <div className="w-full">
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
      <div>
        <h1 className="text-[18px] md:text-[22px] font-semibold">Attendance</h1>
        <p className="text-[#888888] text-[14px] md:text-[16px]">
          Track Your Child's Attendance with Ease
        </p>
      </div>

      <div className="flex gap-2">
    {/* Month Dropdown */}
<div className="relative dropdown">
  <button
    className="flex gap-1 items-center bg-white px-3 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow"
    onClick={() => setOpenDropdown(openDropdown === "month" ? null : "month")}
  >
    {selectedMonth} <IoIosArrowDown />
  </button>

  {openDropdown === "month" && (
    <ul
      className="absolute left-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-md z-10 overflow-y-auto max-h-48 py-1"
    >
      {months.map((month) => (
        <li
          key={month}
          className="px-3 py-2 cursor-pointer hover:bg-gray-100"
          onClick={() => {
            setSelectedMonth(month);
            setOpenDropdown(null);
          }}
        >
          {month}
        </li>
      ))}
    </ul>
  )}
</div>

{/* Year Dropdown */}
<div className="relative dropdown">
  <button
    className="flex gap-1 items-center bg-white px-3 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow"
    onClick={() => setOpenDropdown(openDropdown === "year" ? null : "year")}
  >
    {selectedYear} <IoIosArrowDown />
  </button>

  {openDropdown === "year" && (
    <ul
      className="absolute left-0 mt-2 w-24 bg-white border border-gray-200 rounded-md shadow-md z-10 overflow-y-auto max-h-48 py-1"
    >
      {years.map((year) => (
        <li
          key={year}
          className="px-3 py-2 cursor-pointer hover:bg-gray-100"
          onClick={() => {
            setSelectedYear(year);
            setOpenDropdown(null);
          }}
        >
          {year}
        </li>
      ))}
    </ul>
  )}
</div>

    </div>
    </div>

    {/* Attendance Calendar */}
    <div className="mt-4 overflow-x-auto">
      <AttendanceCalendar />
    </div>
  </div>
</div>

      </div>

  );
}

export default Dashboard;
