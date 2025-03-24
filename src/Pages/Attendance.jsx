import React, { useState } from 'react';
import { IoIosArrowDown } from "react-icons/io";
import AttendanceCalendar from '../Components/AttendanceCalendar ';

// List of months and years
const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const years = Array.from({ length: 10 }, (_, i) => 2025 - i); // Generate last 10 years

function Attendance() {
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [selectedYear, setSelectedYear] = useState(2025);
  const [monthDropdown, setMonthDropdown] = useState(false);
  const [yearDropdown, setYearDropdown] = useState(false);

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6">
      
      {/* Attendance Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[20px] md:text-[24px]">Attendance</h1>
          <p className="text-[#aaaaaa] text-[12px] md:text-[16px]">
            Track Your Child’s Attendance with Ease
          </p>
        </div>

        {/* Dropdown for Month & Year */}
        <div className="flex space-x-3 relative">
          
          {/* Month Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setMonthDropdown(!monthDropdown)} 
              className="flex gap-1 items-center bg-white p-[6px] rounded-lg shadow-lg hover:shadow-md transition-shadow"
            >
              {selectedMonth} <IoIosArrowDown />
            </button>

            {monthDropdown && (
              <ul className="absolute left-0 mt-1 w-full bg-white shadow-md rounded-lg z-10 max-h-40 overflow-y-auto">
                {months.map((month) => (
                  <li 
                    key={month} 
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedMonth(month);
                      setMonthDropdown(false);
                    }}
                  >
                    {month}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Year Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setYearDropdown(!yearDropdown)} 
              className="flex gap-1 items-center bg-white p-[6px] rounded-lg shadow-lg hover:shadow-md transition-shadow"
            >
              {selectedYear} <IoIosArrowDown />
            </button>

            {yearDropdown && (
              <ul className="absolute left-0 mt-1 w-full bg-white shadow-md rounded-lg z-10 max-h-40 overflow-y-auto">
                {years.map((year) => (
                  <li 
                    key={year} 
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedYear(year);
                      setYearDropdown(false);
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

      {/* Calendar Component */}
      <AttendanceCalendar />
    </div>
  );
}

export default Attendance;
