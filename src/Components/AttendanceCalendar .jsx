import React, { useState, useEffect, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { useAttendance } from "../hooks/useAttendance";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const AttendanceCalendar = () => {
  const { attendanceData, loading, error, getAttendanceById } = useAttendance();
  const [calendarHeight, setCalendarHeight] = useState(500);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);

  // Load students from localStorage only once
  useEffect(() => {
    const storedStudents = localStorage.getItem('parent_students');
    if (storedStudents) {
      try {
        const parsedStudents = JSON.parse(storedStudents);
        setStudents(parsedStudents);
        if (parsedStudents.length > 0 && !selectedStudent) {
          setSelectedStudent(parsedStudents[0]._id);
        }
      } catch (err) {
        console.error('Failed to parse stored students:', err);
      }
    }
  }, []); // Empty dependency array to run only once

  // Fetch attendance when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      getAttendanceById(selectedStudent);
    }
  }, [selectedStudent, getAttendanceById]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCalendarHeight(mobile ? 350 : 500);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStudentChange = (e) => {
    setSelectedStudent(e.target.value);
  };

  // Memoize the event generation
  const generateGroupedAttendance = useCallback(() => {
    if (!attendanceData || !attendanceData.records) return [];

    return attendanceData.records.map((record) => {
      const currentDate = new Date(record.date);
      const status = record.status === "absent" ? "Absent" : "Present";
      const backgroundColor = status === "Absent" ? "#F5EBEB" : "#e5ebf0";

      return {
        title: status,
        start: currentDate,
        end: currentDate,
        allDay: true,
        backgroundColor,
      };
    });
  }, [attendanceData]);

  const components = {
    dateCellWrapper: ({ value, children }) => {
      const isToday = moment(value).isSame(moment(), 'day');
      return (
        <div className="rbc-day-bg relative h-full">
          <div className={`absolute ${isMobile ? 'top-1 left-1 text-xs' : 'top-2 left-2 text-sm'} font-medium`}>
            {value.getDate()}
          </div>
          {isToday && (
            <div className={`absolute ${isMobile ? 'top-1 right-1 text-[10px] px-1' : 'top-2 right-2 text-xs px-2'} border border-blue-500 py-0.5 rounded-md`}>
              Today
            </div>
          )}
          {children}
        </div>
      );
    },
    header: ({ label }) => (
      <div className="text-xs font-semibold uppercase p-1">
        {isMobile ? label.charAt(0) : label.substring(0, 3)}
      </div>
    ),
  };

  if (loading && !attendanceData) {
    return <div className="p-4">Loading attendance data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        Error: {error}
        {error.includes('404') && (
          <p className="mt-2">Attendance data not found for this student.</p>
        )}
      </div>
    );
  }

  if (students.length === 0) {
    return <div className="p-4">No students found. Please contact your school administrator.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Student
        </label>
        <select
          id="student-select"
          value={selectedStudent || ''}
          onChange={handleStudentChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {students.map((student) => (
            <option key={student._id} value={student._id}>
              {student.firstName} {student.lastName}
            </option>
          ))}
        </select>
      </div>
      
      {attendanceData?.records?.length > 0 ? (
        <Calendar
          localizer={localizer}
          events={generateGroupedAttendance()}
          startAccessor="start"
          endAccessor="end"
          views={["month"]}
          style={{ height: calendarHeight }}
          components={components}
          toolbar={false}
          formats={{
            dateFormat: 'D',
            dayFormat: 'ddd',
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.backgroundColor,
              color: "#000",
              padding: isMobile ? "2px" : "4px",
              textAlign: "center",
              minHeight: isMobile ? "18px" : "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? "10px" : "12px",
              fontWeight: "500",
            },
          })}
        />
      ) : (
        <div className="p-4 text-center text-gray-500">
          No attendance records found for the selected student.
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;