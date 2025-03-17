import React from 'react'
import { FiDownload } from "react-icons/fi";
import AttendanceTimetable from '../Components/AttendanceTimetable';



function Timetable() {
  return (
    <div className="flex min-h-screen p-6 flex-col gap-6">
      <div className='flex justify-between items-center'>
              <div>
              <h1 className='text-[20px]'>Timetable</h1>
              <p className='text-[#aaaaaa] text-[18px]'>Stay on Track with Your Class Schedule!</p>
              </div>
            
            <div className='flex space-x-3 mt-auto'>
              <button 
                className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105">
                Download <FiDownload/>
                </button>
            </div>
      
            </div>
      

      {/* Attendance Section */}
      <div className="">
        <AttendanceTimetable />
      </div>
    </div>
  )
}

export default Timetable
