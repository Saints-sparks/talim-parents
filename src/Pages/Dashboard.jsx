import React, { useState, useEffect, useMemo } from "react";
import { LuArrowUp, LuArrowDown } from "react-icons/lu";
import { IoIosArrowDown } from "react-icons/io";
import AttendanceCalendar from '../Components/AttendanceCalendar';
import { useSubjects } from '../hooks/useSubjects';
import SkeletonLoader from '../Components/SkeletonLoader';
import LoadError from "../Components/loadError";

function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [selectedYear, setSelectedYear] = useState(2025);
  const [openDropdown, setOpenDropdown] = useState(null);
  const { totalSubjects, loading, error } = useSubjects();

  // Memoize boxes to prevent unnecessary re-renders
  const boxes = useMemo(() => [
    {
      number: loading ? "..." : error ? "Error" : totalSubjects,
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
  ], [loading, error, totalSubjects]);

  // Handle dropdown outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!(event.target.closest(".dropdown"))) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDropdownToggle = (type) => {
    setOpenDropdown(openDropdown === type ? null : type);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => 2021 + i);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Overview Section */}
        <section className="space-y-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Overview</h1>
          
          {error && (
            <LoadError
              message={`Error loading subjects: ${error}. Please check your connection and try again.`}
              onRetry={() => window.location.reload()}
            />
          )}

          {!error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <>
                  <SkeletonLoader type="card" />
                  <SkeletonLoader type="card" />
                  <SkeletonLoader type="card" />
                </>
              ) : (
                boxes.map((box, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <p className="text-gray-500 text-sm mb-1">{box.text}</p>
                        <h2 className="text-2xl sm:text-3xl font-medium text-gray-900">
                          {box.number}
                        </h2>
                      </div>
                      {box.percentage && (
                        <div className={`flex items-center ${box.color} gap-2 px-3 py-1.5 rounded-lg self-end mt-4 text-sm font-medium`}>
                          {box.icon}
                          <span>{box.percentage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Attendance Section */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          {loading ? (
            // Show skeleton loader for attendance section while loading
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="w-full sm:w-1/2">
                  <SkeletonLoader type="custom" height="32px" width="200px" className="mb-2" />
                  <SkeletonLoader type="custom" height="20px" width="250px" />
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <SkeletonLoader type="custom" height="40px" width="120px" />
                  <SkeletonLoader type="custom" height="40px" width="100px" />
                </div>
              </div>
              <SkeletonLoader type="custom" height="400px" className="w-full" />
            </div>
          ) : (
            // Show actual attendance content when loaded
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Attendance</h2>
                  <p className="text-gray-500 mt-1">Track Your Child's Attendance with Ease</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* Month Dropdown */}
                  <div className="relative dropdown">
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => handleDropdownToggle("month")}
                    >
                      <span className="min-w-[80px] text-left">{selectedMonth}</span>
                      <IoIosArrowDown className={`transition-transform duration-200 ${openDropdown === "month" ? "rotate-180" : ""}`} />
                    </button>

                    {openDropdown === "month" && (
                      <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {months.map((month) => (
                          <li
                            key={month}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
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
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => handleDropdownToggle("year")}
                    >
                      <span className="min-w-[60px] text-left">{selectedYear}</span>
                      <IoIosArrowDown className={`transition-transform duration-200 ${openDropdown === "year" ? "rotate-180" : ""}`} />
                    </button>

                    {openDropdown === "year" && (
                      <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {years.map((year) => (
                          <li
                            key={year}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
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

              {/* Calendar Container */}
              <div className="rounded-lg overflow-hidden">
                <AttendanceCalendar />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;