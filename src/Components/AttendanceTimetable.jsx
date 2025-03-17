import React from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const events = [
  { title: "Mathematics", start: new Date(2024, 1, 5, 8, 0), end: new Date(2024, 1, 5, 9, 0) },
  { title: "Mathematics", start: new Date(2024, 1, 6, 8, 0), end: new Date(2024, 1, 6, 9, 0) },
  { title: "Mathematics", start: new Date(2024, 1, 7, 8, 0), end: new Date(2024, 1, 7, 9, 0) },
  { title: "Mathematics", start: new Date(2024, 1, 8, 8, 0), end: new Date(2024, 1, 8, 9, 0) },
  { title: "Mathematics", start: new Date(2024, 1, 9, 8, 0), end: new Date(2024, 1, 9, 9, 0) },

  { title: "English", start: new Date(2024, 1, 5, 9, 0), end: new Date(2024, 1, 5, 10, 0) },
  { title: "Civic Education", start: new Date(2024, 1, 6, 9, 0), end: new Date(2024, 1, 6, 10, 0) },
  { title: "English", start: new Date(2024, 1, 7, 9, 0), end: new Date(2024, 1, 7, 10, 0) },
  { title: "Civic Education", start: new Date(2024, 1, 8, 9, 0), end: new Date(2024, 1, 8, 10, 0) },
  { title: "English", start: new Date(2024, 1, 9, 9, 0), end: new Date(2024, 1, 9, 10, 0) },

  { title: "Social Studies", start: new Date(2024, 1, 5, 10, 0), end: new Date(2024, 1, 5, 11, 0) },
  { title: "Social Studies", start: new Date(2024, 1, 6, 10, 0), end: new Date(2024, 1, 6, 11, 0) },
  { title: "Civic Education", start: new Date(2024, 1, 7, 10, 0), end: new Date(2024, 1, 7, 11, 0) },
  { title: "Social Studies", start: new Date(2024, 1, 8, 10, 0), end: new Date(2024, 1, 8, 11, 0) },
  { title: "Civic Education", start: new Date(2024, 1, 9, 10, 0), end: new Date(2024, 1, 9, 11, 0) },

  { title: "BREAK - TIME", start: new Date(2024, 1, 5, 11, 0), end: new Date(2024, 1, 5, 12, 0) },
  { title: "BREAK - TIME", start: new Date(2024, 1, 6, 11, 0), end: new Date(2024, 1, 6, 12, 0) },
  { title: "BREAK - TIME", start: new Date(2024, 1, 7, 11, 0), end: new Date(2024, 1, 7, 12, 0) },
  { title: "BREAK - TIME", start: new Date(2024, 1, 8, 11, 0), end: new Date(2024, 1, 8, 12, 0) },
  { title: "BREAK - TIME", start: new Date(2024, 1, 9, 11, 0), end: new Date(2024, 1, 9, 12, 0) },

  { title: "Science", start: new Date(2024, 1, 5, 12, 0), end: new Date(2024, 1, 5, 13, 0) },
  { title: "Science", start: new Date(2024, 1, 6, 12, 0), end: new Date(2024, 1, 6, 13, 0) },
  { title: "Science", start: new Date(2024, 1, 7, 12, 0), end: new Date(2024, 1, 7, 13, 0) },
  { title: "Science", start: new Date(2024, 1, 8, 12, 0), end: new Date(2024, 1, 8, 13, 0) },
  { title: "Science", start: new Date(2024, 1, 9, 12, 0), end: new Date(2024, 1, 9, 13, 0) },

  { title: "Arts & Craft", start: new Date(2024, 1, 5, 13, 0), end: new Date(2024, 1, 5, 14, 0) },
  { title: "French", start: new Date(2024, 1, 6, 13, 0), end: new Date(2024, 1, 6, 14, 0) },
  { title: "Arts & Craft", start: new Date(2024, 1, 7, 13, 0), end: new Date(2024, 1, 7, 14, 0) },
  { title: "French", start: new Date(2024, 1, 8, 13, 0), end: new Date(2024, 1, 8, 14, 0) },
  { title: "Arts & Craft", start: new Date(2024, 1, 9, 13, 0), end: new Date(2024, 1, 9, 14, 0) },
];

// Color mapping for different subjects
const subjectColors = {
  "Mathematics": "#4285F4", // Blue
  "English": "#34A853", // Green
  "Civic Education": "#FBBC05", // Yellow
  "Social Studies": "#EA4335", // Red
  "BREAK - TIME": "#9E9E9E", // Gray
  "Science": "#673AB7", // Purple
  "Arts & Craft": "#FF9800", // Orange
  "French": "#00BCD4", // Cyan
};

// Enhanced events with additional details
const enhancedEvents = events.map(event => ({
  ...event,
  subject: event.title,
  backgroundColor: subjectColors[event.title] || "#039BE5", // Default blue if not found
}));

function AttendanceTimetable() {
  // Custom components for the calendar
  const components = {
    // Custom event component
    event: ({ event }) => (
      <div className="h-full w-full flex flex-col justify-center p-1">
        <div className="font-bold text-sm">{event.title}</div>
        <div className="text-xs opacity-90">
          {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
        </div>
      </div>
    ),
    // Custom time slot label
    timeGutterHeader: () => <div className="text-center font-semibold p-1">Time</div>,
    // Custom day header
    timeSlotWrapper: ({ value, children }) => {
      return <div className="rbc-time-slot font-medium">{children}</div>;
    },
    // Custom header for days
    header: ({ date, localizer }) => {
      const dayName = localizer.format(date, 'dddd');
      const dayNumber = localizer.format(date, 'D');
      return (
        <div className="flex flex-col items-center py-2">
          <div className="font-bold">{dayName}</div>
          <div className="text-sm opacity-75">{dayNumber}</div>
        </div>
      );
    }
  };

  // Custom formats
  const formats = {
    timeGutterFormat: (date, culture, localizer) =>
      localizer.format(date, 'h:mm A', culture),
    dayFormat: (date, culture, localizer) =>
      localizer.format(date, 'ddd', culture),
  };

  return (
    <div style={{ padding: "10px", background: "#fff", borderRadius: "8px" }}>
      <style>
        {`
          /* Custom styles for the calendar */
          .rbc-time-view {
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .rbc-timeslot-group {
            min-height: 80px !important;
            border-bottom: 1px solid #f3f4f6;
          }
          
          .rbc-header {
            font-weight: 600;
            background-color: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .rbc-label {
            font-weight: 500;
            color: #6b7280;
          }
          
          .rbc-event {
            border-radius: 6px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            border: none !important;
            padding: 2px !important;
          }
          
          .rbc-day-slot .rbc-event {
            border-left: 4px solid rgba(0,0,0,0.2) !important;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .rbc-day-slot .rbc-events-container {
            margin-right: 0 !important;
          }
          
          .rbc-time-content {
            border-top: 1px solid #e5e7eb;
          }
          
          .rbc-time-content > * + * > * {
            border-left: 1px solid #f3f4f6;
          }
          
          .rbc-today {
            background-color: #f0f9ff;
          }
          
          /* Break time styling */
          .rbc-event.break-time {
            background-color: #f3f4f6 !important;
            color: #6b7280 !important;
            font-style: italic;
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
        min={new Date(2024, 1, 1, 8, 0)}
        max={new Date(2024, 1, 1, 14, 0)}
        style={{ height: 600 }}
        components={components}
        formats={formats}
        eventPropGetter={(event) => ({
          className: event.title === "BREAK - TIME" ? "break-time" : "",
          style: {
            backgroundColor: event.backgroundColor,
          },
        })}
      />
    </div>
  );
}

export default AttendanceTimetable;