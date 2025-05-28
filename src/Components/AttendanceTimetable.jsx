import React, { useState, useEffect } from "react";

function AttendanceTimetable({ timetables, loading, error, studentName, className }) {
  const timeSlots = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM"];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

// Update the timeToDecimal function to handle 24-hour format
const timeToDecimal = (timeStr) => {
  if (!timeStr) return 8;
  
  // Normalize the string by removing extra spaces and converting to uppercase
  timeStr = timeStr.trim().toUpperCase();
  
  // Check if it's already in 24-hour format (contains no AM/PM)
  const is24HourFormat = !timeStr.includes('AM') && !timeStr.includes('PM');
  
  if (is24HourFormat) {
    // Handle 24-hour format directly
    let [hours, minutes] = timeStr.split(':').map(Number);
    minutes = minutes || 0;
    return hours + minutes / 60;
  } else {
    // Handle AM/PM format
    let [time, modifier] = timeStr.split(' ');
    if (!modifier) {
      modifier = time.includes('AM') || time.includes('PM') ? time.slice(-2) : null;
      time = time.replace(/AM|PM/, '');
    }
    let [hours, minutes] = time.split(':').map(Number);
    minutes = minutes || 0;
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
  }
};


  const hourHeight = 72;
  const timetableStartHour = 8;

  const getTopPosition = (timeStr) => {
    return (timeToDecimal(timeStr) - timetableStartHour) * hourHeight;
  };

  const getBlockHeight = (start, end) => {
    return (timeToDecimal(end) - timeToDecimal(start)) * hourHeight;
  };

  const formatCurrentTimeLabel = () => {
    return currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentTimeDecimal = currentTime.getHours() + currentTime.getMinutes() / 60;
// Update the renderClassBlock function to handle the property name mismatch
const renderClassBlock = (event, day, index) => {
  // Fix the typo in startTIme (capital I)
  const startTime = event.startTIme || event.startTime || "";
  const endTime = event.endTime || "";

  const top = getTopPosition(startTime);
  const height = getBlockHeight(startTime, endTime);

  const isBreak = event.subject?.toLowerCase().includes("break");

  return (
    <div
      key={`${day}-${index}`}
      className={`absolute left-1 right-1 bg-white rounded-lg shadow-md p-2 cursor-default select-none
        ${isBreak ? "bg-gray-100 text-gray-600 font-semibold" : "text-gray-900"}`}
      style={{
        top: top + 4,
        height: height - 8,
        zIndex: isBreak ? 0 : 10,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
      title={`${event.subject} (${startTime} - ${endTime})`}
    >
      <div className="text-sm font-semibold whitespace-normal break-words">
        {event.subject || "No Subject"}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">
        {startTime && endTime ? `${startTime} - ${endTime}` : "Time not available"}
      </div>
    </div>
  );
};


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading timetable for {studentName}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto bg-gray-100 rounded-lg shadow">
        <div className="flex flex-col items-center text-center">
          <svg
            className="text-red-500 text-3xl mb-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium mb-2 text-gray-900">Unable to load timetable</h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg shadow border border-gray-200 p-6 relative select-none">
      {/* Student Info Header */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{studentName}</h3>
        {className && <p className="text-sm text-gray-600">Class: {className}</p>}
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-6 border-b border-gray-200 mb-4">
        <div className="py-3 text-sm font-semibold text-center border-r border-gray-200 text-gray-700">
          Time
        </div>
        {days.map((day) => (
          <div
            key={day}
            className="py-3 text-sm font-semibold text-center border-r last:border-r-0 border-gray-200 text-gray-700"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Scrollable Timetable Container */}
      <div
        className="overflow-auto"
        style={{
          maxWidth: "100%",
          maxHeight: "480px", // fixed height for rigidity
          border: "1px solid #e5e7eb", // Tailwind gray-200 border color
          borderRadius: "0.5rem",
        }}
      >
        {/* Timetable grid forced to large width and height to enable scrolling */}
        <div
          className="grid grid-cols-6 relative"
          style={{
            minWidth: "720px", // ensure width larger than container for horizontal scroll
            minHeight: "504px", // keep your original height for vertical scroll
          }}
        >
          {/* Time Column */}
          <div className="border-r border-gray-200 relative">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-[72px] flex items-center justify-center text-xs text-gray-500 border-b border-gray-200 font-medium"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {days.map((day) => (
            <div key={day} className="relative border-r border-gray-200 last:border-r-0">
              {timeSlots.map((_, idx) => (
                <div key={idx} className="h-[72px] border-b border-gray-200" />
              ))}

              {timetables[day]?.map((event, i) => renderClassBlock(event, day, i))}
            </div>
          ))}

          {/* Break Time spanning all day columns */}
          <div
            className="absolute bg-white text-gray-600 font-semibold rounded-lg shadow p-2 select-none flex flex-col justify-center items-center text-center"
            style={{
              top: getTopPosition("12:00 PM") + 4,
              height: getBlockHeight("12:00 PM", "1:00 PM") - 8,
              zIndex: 0,
              left: "calc(100% / 6)", // start after the Time column (which is 1/6th)
              right: 0, // stretch to the right edge
            }}
          >
            BREAK - TIME
            <div className="text-xs mt-0.5">12:00 PM - 1:00 PM</div>
          </div>

          {/* Current Time Line */}
          {currentTimeDecimal >= timetableStartHour && currentTimeDecimal <= 14 && (
            <>
              <div
                className="absolute left-0 right-0 border-t-2 border-[#003366]"
                style={{
                  top: (currentTimeDecimal - timetableStartHour) * hourHeight + 36,
                  zIndex: 30,
                }}
              />
              <div
                className="absolute left-0 text-white bg-[#003366] font-semibold text-xs select-none rounded"
                style={{
                  top: (currentTimeDecimal - timetableStartHour) * hourHeight + 30,
                  zIndex: 31,
                  padding: "2px 4px",
                  minWidth: "38px",
                  textAlign: "center",
                }}
              >
                {formatCurrentTimeLabel()}
              </div>
              <div
                className="absolute left-0 w-3 h-3 rounded-full bg-[#003366]"
                style={{
                  top: (currentTimeDecimal - timetableStartHour) * hourHeight + 34.5,
                  zIndex: 32,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceTimetable;
