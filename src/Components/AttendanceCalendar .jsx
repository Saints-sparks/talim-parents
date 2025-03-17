import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const generateGroupedAttendance = () => {
  let today = new Date();
  let startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let events = [];
  let previousStatus = null;

  for (let i = 0; i < 30; i++) {
    let currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    if (currentDate > today) break;

    let isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    let isAbsent = Math.random() < 0.2 && !isWeekend;
    let status = isAbsent ? "Absent" : "Present";
    let backgroundColor = isAbsent ? "#F5EBEB" : "#e5ebf0";

    // Check if it's start of a new group or end of current group
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
      isGroupEnd
    });

    previousStatus = status;
  }

  return events;
};

const getStatusForDate = (date) => {
  let isWeekend = date.getDay() === 0 || date.getDay() === 6;
  let isAbsent = Math.random() < 0.2 && !isWeekend;
  return isAbsent ? "Absent" : "Present";
};

const AttendanceCalendar = () => {
  const [events, setEvents] = useState(generateGroupedAttendance());
  const [calendarHeight, setCalendarHeight] = useState(600);
  const [isMobile, setIsMobile] = useState(false);

  // Check window size on mount and resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Adjust height based on screen size
      if (mobile) {
        setCalendarHeight(400); // Smaller height on mobile
      } else {
        setCalendarHeight(600); // Original height on desktop
      }
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const components = {
    dateCellWrapper: (props) => {
      const isToday = moment(props.value).isSame(moment(), 'day');
      
      return (
        <div className="rbc-day-bg relative h-full">
          <div className="absolute top-2 left-2 text-sm font-medium">
            {props.value.getDate()}
          </div>
          {isToday && (
            <div className="absolute top-2 right-2 text-xs border border-blue-500 px-2 py-0.5 rounded-md">
              Today
            </div>
          )}
          {props.children}
        </div>
      );
    },
    // Override header cells to use Tailwind classes
    header: ({ label }) => (
      <div className="text-xs md:text-sm font-semibold uppercase p-1 md:p-2">
        {isMobile ? label.substring(0, 1) : label}
      </div>
    )
  };

  // Custom styles with responsive adjustments
  const customStyles = {
    '.rbc-date-cell': {
      textAlign: 'left !important',
      padding: '8px !important'
    },
    '.rbc-row-bg': {
      marginTop: isMobile ? '16px' : '24px'
    },
    '.rbc-date-cell > a': {
      display: 'none !important'
    },
    '.rbc-row-content': {
      marginTop: isMobile ? '16px' : '24px'
    },
    '.rbc-button-link': {
      display: 'none !important'
    },
    '.rbc-month-view': {
      fontSize: isMobile ? '12px !important' : '14px !important'
    },
    '.rbc-header': {
      padding: isMobile ? '2px !important' : '4px !important'
    },
    '.rbc-month-row': {
      minHeight: isMobile ? '80px !important' : '100px !important'
    }
  };

  return (
    <div className="bg-white p-2 md:p-4 rounded-[10px] overflow-x-auto">
      <style>
        {Object.entries(customStyles)
          .map(([selector, styles]) => `${selector} { ${Object.entries(styles)
            .map(([prop, value]) => `${prop}: ${value}`)
            .join('; ')} }`)
          .join('\n')}
      </style>
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
          dayFormat: 'ddd'
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.backgroundColor,
            color: event.title ? "#000" : "transparent",
            borderRadius: event.isGroupStart ? "8px 0 0 8px" : 
                        event.isGroupEnd ? "0 8px 8px 0" : "0",
            padding: isMobile ? "2px" : "5px",
            textAlign: "center",
            minWidth: isMobile ? "100px" : "160px",
            minHeight: isMobile ? "20px" : "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: event.isGroupStart ? "1px" : "-1px",
            marginRight: event.isGroupEnd ? "1px" : "-1px",
            zIndex: event.title ? "1" : "0",
            marginTop: isMobile ? "16px" : "24px",
            fontSize: isMobile ? "11px" : "14px"
          },
        })}
      />
    </div>
  );
};

export default AttendanceCalendar;