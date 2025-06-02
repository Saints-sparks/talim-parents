import React, { useState, useEffect } from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAttendance } from "../hooks/useAttendance";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";
import SkeletonLoader from "./SkeletonLoader";
import LoadError from "../Components/loadError"; // Import LoadError

// List of months
const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const AttendanceCalendar = ({ selectedMonth, selectedYear }) => {
  const { attendanceData, loading, error, getAttendanceById } = useAttendance();
  const [currentDate, setCurrentDate] = useState(moment());
  const { selectedStudent } = useSelectedStudent();

  // Set initial date based on selected month/year
  useEffect(() => {
    if (selectedMonth && selectedYear) {
      const monthIndex = months.findIndex(m => m === selectedMonth);
      setCurrentDate(moment().year(selectedYear).month(monthIndex));
    }
  }, [selectedMonth, selectedYear]);

  // Fetch attendance data when student or date changes
  useEffect(() => {
    if (selectedStudent?._id) {
      getAttendanceById(selectedStudent._id, currentDate.year(), currentDate.month() + 1);
    }
  }, [selectedStudent, currentDate, getAttendanceById]);

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
      
      // Start new row after Friday (day 5) or last day of month
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
    return <>
      <SkeletonLoader/>
    </>
  }

  if (error) {
    return (
      <LoadError
        message={`Error loading attendance data: ${error}`}
        onRetry={() => {
          if (selectedStudent?._id) {
            getAttendanceById(selectedStudent._id, currentDate.year(), currentDate.month() + 1);
          }
        }}
      />
    );
  }

  if (!selectedStudent) {
    return <div className="p-4">Please select a student first.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <div className="text-sm font-medium text-gray-700 mb-1">
          Viewing attendance for:{" "}
          <span className="font-bold">
            {selectedStudent.userId?.firstName} {selectedStudent.userId?.lastName}
            {selectedStudent.classId?.name && ` - ${selectedStudent.classId.name}`}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setCurrentDate(currentDate.clone().subtract(1, 'month'))}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-medium text-gray-700">
            {currentDate.format('MMMM YYYY')}
          </h3>
          <button 
            onClick={() => setCurrentDate(currentDate.clone().add(1, 'month'))}
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
      {/* <div className="p-4 border-t">
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
      </div> */}
    </div>
  );
};

export default AttendanceCalendar;
