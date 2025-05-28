import React, { useState, useEffect } from 'react';
import { IoIosArrowDown } from "react-icons/io";
import AttendanceCalendar from '../Components/AttendanceCalendar';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import SkeletonLoader from '../Components/SkeletonLoader';
import LoadError from '../Components/loadError';  // Import LoadError

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];
const years = Array.from({ length: 10 }, (_, i) => 2025 - i);

function Attendance() {
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [selectedYear, setSelectedYear] = useState(2025);
  const [monthDropdown, setMonthDropdown] = useState(false);
  const [yearDropdown, setYearDropdown] = useState(false);
  const { selectedStudent } = useSelectedStudent();

  // Add error state (simulate no error initially)
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    setError(null);

    // Simulate data loading with possible error after 1s
    setTimeout(() => {
      // Simulate success or failure here:
      const simulateError = false; // set true to test error UI

      if (simulateError) {
        setError("Failed to load attendance data.");
        setLoading(false);
      } else {
        setLoading(false);
        setError(null);
      }
    }, 1000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTitle = () => {
    if (!selectedStudent) return "Attendance";
    return `${selectedStudent.userId.firstName}'s Attendance`;
  };

  if (error) {
    return (
      <LoadError
        message={error}
        onRetry={() => loadData()}
      />
    );
  }

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6">

      {/* Attendance Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[20px] md:text-[24px]">{getTitle()}</h1>
          <p className="text-[#aaaaaa] text-[12px] md:text-[16px]">
            {selectedStudent 
              ? `Track ${selectedStudent.userId.firstName}'s Attendance with Ease`
              : "Track Your Child's Attendance with Ease"}
          </p>
        </div>

        {/* Dropdowns */}
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
      <div className="min-h-[400px]">
        {loading ? (
          <SkeletonLoader type="card" count={3} />
        ) : (
          <AttendanceCalendar 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear}
          />
        )}
      </div>
    </div>
  );
}

export default Attendance;
