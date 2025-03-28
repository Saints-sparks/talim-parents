import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const events = [
  { title: "Mathematics", start: new Date(2025, 2, 26, 8, 0), end: new Date(2025, 2, 26, 10, 20) },
  { title: "Mathematics", start: new Date(2025, 3, 1, 8, 0), end: new Date(2025, 3, 1, 9, 0) },
  { title: "Mathematics", start: new Date(2025, 2, 27, 8, 0), end: new Date(2025, 2, 27, 9, 0) },
  { title: "Mathematics", start: new Date(2025, 2, 20, 8, 0), end: new Date(2025, 2, 20, 9, 0) },
  { title: "Mathematics", start: new Date(2025, 2, 21, 8, 0), end: new Date(2025, 2, 21, 9, 0) },
  { title: "English", start: new Date(2025, 2, 28, 9, 0), end: new Date(2025, 2, 28, 10, 0) },
  { title: "Civic Education", start: new Date(2025, 2, 28, 12, 0), end: new Date(2025, 2, 28, 13, 0) },
  { title: "English", start: new Date(2025, 2, 27, 9, 0), end: new Date(2025, 2, 27, 10, 0) },
  { title: "Civic Education", start: new Date(2025, 2, 20, 9, 0), end: new Date(2025, 2, 20, 10, 0) },
  { title: "English", start: new Date(2025, 2, 25, 9, 0), end: new Date(2025, 2, 25, 10, 0) },
];

const subjectColors = {
  "Mathematics": "#4285F4",
  "English": "#34A853",
  "Civic Education": "#FBBC05",
  "BREAK - TIME": "#9E9E9E",
};

const enhancedEvents = events.map(event => ({
  ...event,
  textColor: subjectColors[event.title] || "#000000",
}));

const TimeGutterHeader = () => (
  <div className="text-center font-bold p-1 text-xs sm:text-sm">Time</div>
);

const getMobileTitle = (title) => {
  const abbreviations = {
    "Mathematics": "Math",
    "English": "Eng",
    "Civic Education": "Civic",
    "BREAK - TIME": "Break",
  };
  return abbreviations[title] || title;
};

function AttendanceTimetable() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const components = {
    event: ({ event }) => (
      <div
        className="h-full w-full flex flex-col justify-center text-center p-1 overflow-hidden rounded shadow-sm transition-all duration-200 hover:shadow-md"
        style={{ 
          color: event.textColor,
          backgroundColor: `${event.textColor}10`
        }}
      >
        <div className="font-bold text-xs sm:text-sm truncate w-full">
          {isMobile ? getMobileTitle(event.title) : event.title}
        </div>
        <div className="text-[10px] sm:text-xs opacity-90 truncate w-full">
          {moment(event.start).format("h:mm")} - {moment(event.end).format("h:mm")}
        </div>
      </div>
    ),
    timeGutterHeader: TimeGutterHeader,
  };

  return (
    <div className="p-2 sm:p-4 bg-white rounded-lg shadow-sm">
      <style>
        {`
          .rbc-calendar {
            min-height: 400px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          
          .rbc-header {
            padding: 8px 4px;
            font-weight: 600;
            font-size: ${isMobile ? '12px' : '14px'};
            text-transform: ${isMobile ? 'uppercase' : 'none'};
          }
          
          .rbc-time-header-content {
            border-left: 1px solid #ddd;
          }
          
          .rbc-timeslot-group {
            min-height: ${isMobile ? '60px' : '80px'};
          }
          
          .rbc-time-slot {
            font-size: ${isMobile ? '11px' : '13px'};
          }
          
          .rbc-day-slot .rbc-event {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            background-color: white !important;
            border: 1px solid #eee;
            border-radius: 6px;
            padding: ${isMobile ? '2px' : '4px'};
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          
          .rbc-time-content {
            border-top: 1px solid #ddd;
          }
          
          .rbc-time-gutter .rbc-timeslot-group {
            border-right: 1px solid #ddd;
          }
          
          @media (max-width: 640px) {
            .rbc-time-gutter {
              font-size: 11px;
            }
            
            .rbc-day-slot .rbc-event-content {
              font-size: 10px;
              line-height: 1.2;
            }
          }
        `}
      </style>
      <Calendar
        localizer={localizer}
        events={enhancedEvents}
        startAccessor="start"
        endAccessor="end"
        views={[Views.WORK_WEEK]}
        defaultView={Views.WORK_WEEK}
        timeslots={1}
        step={60}
        toolbar={false}
        min={new Date(2025, 2, 17, 8, 0)}
        max={new Date(2025, 2, 17, 14, 0)}
        style={{ height: isMobile ? 500 : 600 }}
        components={components}
        eventPropGetter={() => ({
          style: { backgroundColor: "white" },
        })}
        formats={{
          timeGutterFormat: (date, culture, localizer) =>
            isMobile 
              ? localizer.format(date, "ha", culture) 
              : localizer.format(date, "h:mm A", culture),
          dayFormat: (date, culture, localizer) =>
            isMobile
              ? localizer.format(date, "ddd", culture)
              : localizer.format(date, "dddd", culture),
        }}
      />
    </div>
  );
}

export default AttendanceTimetable;