import React, { useState, useEffect } from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAttendance } from "../hooks/useAttendance";

const AttendanceCalendar = () => {
  const { attendanceData, loading, error, getAttendanceById } = useAttendance();
  const [currentDate, setCurrentDate] = useState(moment());
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);

  // Fetch students from localStorage
  useEffect(() => {
    const storedStudents = localStorage.getItem('parent_students');
    if (storedStudents) {
      try {
        const parsedStudents = JSON.parse(storedStudents);
        setStudents(parsedStudents);
        if (parsedStudents.length > 0) {
          setSelectedStudent(parsedStudents[0]._id);
        }
      } catch (err) {
        console.error('Error loading students:', err);
      }
    }
  }, []);

  // Fetch attendance data when student changes
  useEffect(() => {
    if (selectedStudent) {
      getAttendanceById(selectedStudent);
    }
  }, [selectedStudent, getAttendanceById]);

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.clone().subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate(currentDate.clone().add(1, 'month'));
  };

  const handleStudentChange = (e) => {
    setSelectedStudent(e.target.value);
  };

  // Calculate attendance stats from API data
  const getAttendanceStats = () => {
    if (!attendanceData || !attendanceData.records) {
      return { present: 0, absent: 0, percentage: 0 };
    }

    // Filter out weekend records
    const weekdayRecords = attendanceData.records.filter(record => {
      const day = moment(record.date).day();
      return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
    });

    const present = weekdayRecords.filter(r => r.status === 'present').length;
    const absent = weekdayRecords.filter(r => r.status === 'absent').length;
    const total = present + absent;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { present, absent, percentage };
  };

  const attendanceStats = getAttendanceStats();

  // Format attendance data for calendar display
  const formatAttendanceData = () => {
    if (!attendanceData || !attendanceData.records) return {};
    
    return attendanceData.records.reduce((acc, record) => {
      const day = moment(record.date).day();
      // Skip weekends
      if (day === 0 || day === 6) return acc;
      
      acc[record.date] = record.status;
      return acc;
    }, {});
  };

  const formattedAttendance = formatAttendanceData();

  // Render calendar days
  const renderCalendarDays = () => {
    const startOfMonth = currentDate.clone().startOf('month');
    const daysInMonth = currentDate.daysInMonth();
    const firstDayOfMonth = startOfMonth.day();
    
    const days = [];
    let currentWeek = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 1; i < firstDayOfMonth; i++) {
      currentWeek.push(<div key={`empty-start-${i}`} className="h-20 border border-gray-200"></div>);
    }
    
    // Add cells for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = currentDate.clone().date(i);
      const dayOfWeek = date.day();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      const dateStr = date.format('YYYY-MM-DD');
      const status = formattedAttendance[dateStr];
      const isToday = date.isSame(moment(), 'day');
      
      currentWeek.push(
        <div 
          key={`day-${i}`} 
          className="h-20 border border-gray-200 p-2 relative"
        >
          <span className="font-medium">{i}</span>
          {isToday && (
            <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 rounded">
              Today
            </span>
          )}
          {status && (
            <div 
              className={`mt-1 text-center text-sm font-medium rounded px-1 ${
                status === 'present' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {status === 'present' ? 'Present' : 'Absent'}
            </div>
          )}
        </div>
      );
      
      // Start new row after Friday (day 5)
      if (dayOfWeek === 5 || i === daysInMonth) {
        days.push(
          <div key={`week-${i}`} className="grid grid-cols-5 gap-0">
            {currentWeek}
          </div>
        );
        currentWeek = [];
      }
    }
    
    return days;
  };

  if (loading && !attendanceData) {
    return <div className="p-4">Loading attendance data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded">
        Error: {error}
      </div>
    );
  }

  if (students.length === 0) {
    return <div className="p-4">No students found.</div>;
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
              {student.userId?.firstName} {student.userId?.lastName}
              {student.classId?.name && ` - ${student.classId.name}`}
            </option>
          ))}
        </select>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handlePrevMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-medium text-gray-700">
            {currentDate.format('MMMM YYYY')}
          </h3>
          <button 
            onClick={handleNextMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Weekday headers */}
        <div className="grid grid-cols-5 gap-0 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
            <div key={day} className="text-center text-xs font-bold uppercase text-gray-500 pb-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days grid */}
        <div className="space-y-0">
          {renderCalendarDays()}
        </div>
      </div>
      
      {/* Attendance stats */}
      <div className="p-4 border-t">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Attendance Percentage</div>
            <div className="text-2xl font-bold">{attendanceStats.percentage}%</div>
          </div>
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="text-sm text-gray-500">Present</div>
              <div className="text-lg font-bold text-blue-600">{attendanceStats.present}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Absent</div>
              <div className="text-lg font-bold text-red-600">{attendanceStats.absent}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;