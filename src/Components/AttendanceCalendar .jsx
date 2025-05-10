import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { useAttendance } from "../hooks/useAttendance"; // Import custom hook
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const AttendanceCalendar = ({ studentId }) => {
  const { attendanceData, loading, error, getAttendanceById } = useAttendance(); // Using custom hook
  const [calendarHeight, setCalendarHeight] = useState(500);
  const [isMobile, setIsMobile] = useState(false);

// Fetch attendance data on component mount (only once)
useEffect(() => {
  getAttendanceById("67d71540ff7f5cd71e70931f");
}, []); // Empty dependency array ensures it runs only once when the component is mounted

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCalendarHeight(mobile ? 350 : 500);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Only runs once on mount

  if (loading) {
    return <div>Loading attendance data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const generateGroupedAttendance = () => {
    if (!attendanceData || !attendanceData.records) return [];

    let events = [];
    let previousStatus = null;

    attendanceData.records.forEach((record) => {
      const currentDate = new Date(record.date); // Assuming `date` field exists
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const status = record.status === "absent" ? "Absent" : "Present"; // Assuming `status` field exists
      const backgroundColor = status === "Absent" ? "#F5EBEB" : "#e5ebf0";

      let isGroupStart = status !== previousStatus;
      let nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      let nextStatus = getStatusForDate(nextDate);
      let isGroupEnd = status !== nextStatus;

      events.push({
        title: isGroupStart ? status : "",
        start: currentDate,
        end: currentDate,
        allDay: true,
        backgroundColor,
        isGroupStart,
        isGroupEnd,
      });

      previousStatus = status;
    });

    return events;
  };

  const getStatusForDate = (date) => {
    let isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return Math.random() < 0.2 && !isWeekend ? "Absent" : "Present";
  };

  const events = generateGroupedAttendance();

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

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <Calendar
        localizer={localizer}
        events={events}
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
            color: event.title ? "#000" : "transparent",
            borderRadius: event.isGroupStart ? "4px 0 0 4px" : 
                         event.isGroupEnd ? "0 4px 4px 0" : "0",
            padding: isMobile ? "2px" : "4px",
            textAlign: "center",
            minHeight: isMobile ? "18px" : "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: event.isGroupStart ? "1px" : "-1px",
            marginRight: event.isGroupEnd ? "1px" : "-1px",
            zIndex: event.title ? "1" : "0",
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: "500",
          },
        })}
      />
    </div>
  );
};

export default AttendanceCalendar;
