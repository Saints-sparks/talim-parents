import React from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

// Updated Dates to March 2025 (Week: 17th - 21st)
const events = [
  { title: "Mathematics", start: new Date(2025, 2, 17, 8, 0), end: new Date(2025, 2, 17, 10, 20) },
  { title: "Mathematics", start: new Date(2025, 2, 18, 8, 0), end: new Date(2025, 2, 18, 9, 0) },
  { title: "Mathematics", start: new Date(2025, 2, 19, 8, 0), end: new Date(2025, 2, 19, 9, 0) },
  { title: "Mathematics", start: new Date(2025, 2, 20, 8, 0), end: new Date(2025, 2, 20, 9, 0) },
  { title: "Mathematics", start: new Date(2025, 2, 21, 8, 0), end: new Date(2025, 2, 21, 9, 0) },
  { title: "English", start: new Date(2025, 2, 18, 9, 0), end: new Date(2025, 2, 18, 10, 0) },
  { title: "Civic Education", start: new Date(2025, 2, 18, 12, 0), end: new Date(2025, 2, 18, 13, 0) },
  { title: "English", start: new Date(2025, 2, 19, 9, 0), end: new Date(2025, 2, 19, 10, 0) },
  { title: "Civic Education", start: new Date(2025, 2, 20, 9, 0), end: new Date(2025, 2, 20, 10, 0) },
  { title: "English", start: new Date(2025, 2, 21, 9, 0), end: new Date(2025, 2, 21, 10, 0) },
];

const subjectColors = {
  "Mathematics": "#4285F4",
  "English": "#34A853",
  "Civic Education": "#FBBC05",
  "BREAK - TIME": "#9E9E9E",
};

const enhancedEvents = events.map(event => ({
  ...event,
  backgroundColor: subjectColors[event.title] || "#039BE5",
}));

function AttendanceTimetable() {
  const components = {
    event: ({ event }) => (
      <div className="h-full w-full flex flex-col justify-center p-1">
        <div className="font-bold text-sm">{event.title}</div>
        <div className="text-xs opacity-90">
          {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
        </div>
      </div>
    ),
    header: ({ date, localizer }) => {
      const isMobile = window.innerWidth < 768;
      const dayName = isMobile ? localizer.format(date, 'ddd') : localizer.format(date, 'dddd');

      return (
        <div className={`flex flex-col items-center py-2 ${isMobile ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="font-bold">{dayName}</div>
        </div>
      );
    },
  };

  return (
    <div style={{ padding: "10px", background: "#fff", borderRadius: "8px" }}>
      <style>
        {`
          .rbc-day-slot .rbc-event {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .rbc-header {
            font-weight: 600;
            background-color: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }

          @media (max-width: 768px) {
            .rbc-header {
              font-size: 12px;
              color: gray;
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
        style={{ height: 600 }}
        components={components}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.backgroundColor,
          },
        })}
      />
    </div>
  );
}

export default AttendanceTimetable;