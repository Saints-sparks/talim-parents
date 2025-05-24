// Timetable.jsx
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { FiDownload, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import AttendanceTimetable from '../Components/AttendanceTimetable';
import { useTimetable } from '../services/timetable.services';

function Timetable() {
  const [notification, setNotification] = useState({
    show: false,
    type: '', // 'success' or 'error'
    message: ''
  });

  const {
    timetables,
    loading,
    error,
    getTimetableByClass,
  } = useTimetable();

  const timetableRef = useRef(null);

  useEffect(() => {
    const parentStudents = JSON.parse(localStorage.getItem('parent_students') || '[]');
    if (parentStudents.length > 0) {
      const selectedStudent = parentStudents[0];
      getTimetableByClass(selectedStudent?.classId?._id);
    }
  }, []);

  const handleDownload = () => {
    if (!timetableRef.current) return;

    html2canvas(timetableRef.current, { scale: 3 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `timetable-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setNotification({
        show: true,
        type: 'success',
        message: 'Timetable downloaded successfully!'
      });

      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    }).catch(() => {
      setNotification({
        show: true,
        type: 'error',
        message: 'Failed to download timetable. Please try again.'
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    });
  };

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6 relative">

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <FiCheckCircle className="mr-2 text-xl" />
          ) : (
            <FiAlertCircle className="mr-2 text-xl" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-[20px]'>Timetable</h1>
          <p className='text-[#aaaaaa] text-[18px]'>Stay on Track with Your Class Schedule!</p>
        </div>
      
        <div className='flex space-x-3 mt-auto'>
          <button 
            onClick={handleDownload}
            className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105"
          >
            Download <FiDownload/>
          </button>
        </div>
      </div>

      {/* Attendance Section */}
      <div ref={timetableRef} className="bg-white rounded-lg shadow border border-gray-200">
        <AttendanceTimetable 
          timetables={timetables}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  )
}

export default Timetable;
