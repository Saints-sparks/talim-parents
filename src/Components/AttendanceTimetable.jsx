import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useTimetable } from "../hooks/useTimetable";
import { FiAlertCircle, FiClock, FiCalendar, FiPlus } from "react-icons/fi";

const localizer = momentLocalizer(moment);

const TimeGutterHeader = () => (
  <div className="text-center font-bold p-1 text-xs sm:text-sm" style={{ color: '#003366' }}>
    Time
  </div>
);

const EventComponent = ({ event, isMobile }) => {
  const subject = event.resource?.subject || 
                 event.resource?.course || 
                 event.title || 
                 "Class";

  const timeDisplay = event.resource?.time || 
                    `${moment(event.start).format("h:mm A")} - ${moment(event.end).format("h:mm A")}`;

  const className = event.resource?.class || "";

  const getMobileTitle = (title) => {
    const abbreviations = {
      "Mathematics": "Math",
      "English": "Eng",
      "Verbal Reasoning": "VR",
      "Elementary schematics": "ES",
      "BREAK - TIME": "Break",
    };
    return abbreviations[title] || title.slice(0, 3);
  };

  return (
    <div className="h-full w-full p-1" style={{ backgroundColor: 'white' }}>
      <div className="font-bold text-xs sm:text-sm truncate" style={{ color: '#003366' }}>
        {isMobile ? getMobileTitle(subject) : subject}
      </div>
      <div className="text-[10px] sm:text-xs truncate" style={{ color: '#003366', opacity: 0.9 }}>
        {timeDisplay}
      </div>
      {className && (
        <div className="text-[10px] sm:text-xs truncate" style={{ color: '#003366', opacity: 0.7 }}>
          {className}
        </div>
      )}
    </div>
  );
};

function AttendanceTimetable() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const parentStudents = JSON.parse(localStorage.getItem("parent_students") || "[]");

  const {
    events,
    loading,
    error,
    getTimetableByClass,
  } = useTimetable();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (parentStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(parentStudents[0]._id);
    }
  }, [parentStudents, selectedStudent]);

  const selectedStudentData = parentStudents.find((s) => s._id === selectedStudent);
  const classId = selectedStudentData?.classId?._id;

  useEffect(() => {
    if (classId) {
      getTimetableByClass(classId);
    }
  }, [classId]);

  const components = {
    event: (props) => <EventComponent {...props} isMobile={isMobile} />,
    timeGutterHeader: TimeGutterHeader,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading timetable data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-red-100 mb-4">
            <FiAlertCircle className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-lg font-medium mb-2" style={{ color: '#003366' }}>Unable to load timetable</h3>
          <p className="mb-4" style={{ color: '#003366' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 bg-white">
      <div className="mb-4">
        <label htmlFor="student-select" className="block text-sm font-medium mb-1" style={{ color: '#003366' }}>
          Select Student:
        </label>
        <select
          id="student-select"
          value={selectedStudent || ""}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="block w-full p-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          style={{ color: '#003366' }}
        >
          {parentStudents.map((student) => (
            <option key={student._id} value={student._id} style={{ color: '#003366' }}>
              {student.userId.firstName} {student.userId.lastName} - {student.classId?.name}
            </option>
          ))}
        </select>
      </div>

      {events.length > 0 ? (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={[Views.WORK_WEEK]}
          defaultView={Views.WORK_WEEK}
          defaultDate={new Date()}
          min={new Date(0, 0, 0, 7, 0, 0)}
          max={new Date(0, 0, 0, 17, 0, 0)}
          timeslots={1}
          step={30}
          toolbar={true}
          style={{ 
            height: isMobile ? 500 : 600,
            color: '#003366'
          }}
          components={components}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: 'white',
              padding: '2px',
              margin: '0',
              border: 'none'
            },
          })}
          formats={{
            timeGutterFormat: 'h:mm A',
            dayFormat: (date, culture, localizer) =>
              isMobile
                ? localizer.format(date, 'ddd', culture)
                : localizer.format(date, 'dddd', culture),
          }}
        />
      ) : (
        <div className="bg-blue-50 border border-blue-100 p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 mb-4">
            <FiCalendar className="h-6 w-6" style={{ color: '#003366' }} />
          </div>
          <h3 className="text-lg font-medium mb-1" style={{ color: '#003366' }}>
            No Timetable Available
          </h3>
          <p style={{ color: '#003366' }}>
            There's no timetable set for {selectedStudentData?.userId.firstName || "this student"} yet.
          </p>
        </div>
      )}
    </div>
  );
}

export default AttendanceTimetable;