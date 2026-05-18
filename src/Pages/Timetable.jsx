import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { FiDownload } from "react-icons/fi";
import AttendanceTimetable from '../Components/AttendanceTimetable';
import SkeletonLoader from '../Components/SkeletonLoader';  // Import SkeletonLoader
import { useTimetable } from '../services/timetable.services';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import LoadError from '../Components/loadError';
import { toast } from '../Components/CustomToast';

function Timetable() {
  const {
    timetables,
    loading,
    error,
    getTimetableByClass,
  } = useTimetable();

  const { selectedStudent } = useSelectedStudent();
  const timetableRef = useRef(null);

  // Fetch timetable when selected student changes
  useEffect(() => {
    if (selectedStudent?.classId?._id) {
      getTimetableByClass(selectedStudent.classId._id);
    }
  }, [selectedStudent, getTimetableByClass]);

  const handleDownload = () => {
    if (!timetableRef.current) return;

    html2canvas(timetableRef.current, { scale: 3 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `timetable-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Timetable downloaded successfully!', 'Download complete');
    }).catch(() => {
      toast.error('Failed to download timetable. Please try again.', 'Download failed');
    });
  };

  // Get title based on selected student
  const getTitle = () => {
    if (!selectedStudent) return "Timetable";
    return `${selectedStudent.userId.firstName}'s Timetable`;
  };

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6 relative">

      <div className='flex justify-between items-center overflow-auto whitespace-nowrap'>
        <div>
          <h1 className='text-[20px] md:text-[24px]'>{getTitle()}</h1>
          <p className='text-[#aaaaaa] text-[12px] md:text-[16px]'>
            {selectedStudent 
              ? `View ${selectedStudent.userId.firstName}'s class schedule` 
              : 'Stay on Track with Your Class Schedule!'}
          </p>
        </div>
      
        <div className='flex space-x-3 mt-auto'>
          <button 
            onClick={handleDownload}
            className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105"
            disabled={!selectedStudent || loading}
          >
            Download <FiDownload/>
          </button>
        </div>
      </div>

      {/* Attendance Section */}
      <div ref={timetableRef} className="bg-white rounded-lg shadow border border-gray-200 min-h-[300px]">
  {!selectedStudent ? (
    <div className="p-6 text-center text-gray-500">
      Please select a student to view their timetable
    </div>
  ) : loading ? (
    <SkeletonLoader type="table" count={1} height="12rem" />
  ) : error ? (
    <LoadError
      message={`Failed to load timetable: ${error}. Please check your connection.`}
      onRetry={() => {
        if(selectedStudent?.classId?._id) {
          getTimetableByClass(selectedStudent.classId._id);
        }
      }}
    />
  ) : (
    <AttendanceTimetable 
      timetables={timetables}
      loading={loading}
      error={error}
      studentName={`${selectedStudent.userId.firstName} ${selectedStudent.userId.lastName}`}
      className={selectedStudent.classId?.name}
    />
  )}
</div>

    </div>
  )
}

export default Timetable;
