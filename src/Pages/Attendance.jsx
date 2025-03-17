import React from 'react';
import { FaArrowUp} from "react-icons/fa";
import { FaArrowDown } from "react-icons/fa";
import { IoIosArrowUp } from "react-icons/io";
import { IoIosArrowDown } from "react-icons/io";
import AttendanceCalendar from '../Components/AttendanceCalendar ';


function Attendance() {
  return (
    <div className="flex min-h-screen p-6 flex-col gap-6">    

    {/* Attendance Section */}
    <div className='flex justify-between items-center'>
      <div>
      <h1 className='text-[20px]'>Attendance</h1>
      <p className='text-[#aaaaaa] text-[18px]'>Track Your Child’s Attendance with Ease</p>
      </div>
    
    <div className='flex space-x-3 mt-auto'>
      <button className='flex gap-1 items-center bg-white p-[6px] rounded-lg shadow-2xl shadow hover:shadow-md hover:shadow-[#003366] transition-shadow'>January <IoIosArrowDown/></button>
      <button className='flex gap-1 items-center bg-white p-[6px] rounded-lg shadow-2xl shadow hover:shadow-md hover:shadow-[#003366] transition-shadow'>2025 <IoIosArrowDown/></button>
    </div>

    </div>

    <AttendanceCalendar />

  </div>
  )
}

export default Attendance
