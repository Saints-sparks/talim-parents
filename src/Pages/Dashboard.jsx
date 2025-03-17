import React from 'react';
import { LuArrowUp} from "react-icons/lu";
import { LuArrowDown } from "react-icons/lu";
import { IoIosArrowUp } from "react-icons/io";
import { IoIosArrowDown } from "react-icons/io";
import AttendanceCalendar from '../Components/AttendanceCalendar ';


const boxes = [
  {
    number: 15,
    text: "Subjects Enrolled",
  },
  {
    number: "85%",
    text: "Grade Score",
    percentage: '15%',
    icon: <LuArrowUp/>,
    color: 'bg-[#e5ebf0]'
  },
  {
    number: "85%",
    text: "Attendance Percentage",
    percentage: '15%',
    icon: <LuArrowDown/>,
    color: 'bg-[#F5EBEB]'
  }
];

function Dashboard() {
  return (
    <div className="flex min-h-screen p-4 md:p-6 flex-col gap-[20px] md:gap-[40px]">
      <h1 className='text-[18px] md:text-[20px]'>Overview</h1>
      
      {/* Stats Boxes - Stack on mobile, horizontal on tablet+ */}
      <div className='flex flex-col md:flex-row gap-3 md:gap-5'>
        {boxes.map((box, index) => (
          <div key={index} className='w-full flex flex-col justify-between h-[110px] bg-white p-4 rounded-[10px] hover:shadow-md hover:shadow-[#003366] transition-shadow'>
            <div>
              <p className="text-gray-500 text-sm md:text-base mb-2">{box.text}</p>
              <h2 className="text-[24px] md:text-[30px] font-semibold">{box.number}</h2>
            </div>
            {box.percentage && (
              <div className={`flex items-center ${box.color} gap-1 p-1 h-[25px] mt-[-70px] rounded-[5px] self-end text-sm`}>
                {box.icon} {box.percentage}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Attendance Section */}
      <div>
        <div className='flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0'>
          <div className=''>
            <h1 className='text-[18px] md:text-[20px]'>Attendance</h1>
            <p className='text-[#aaaaaa] text-[16px] md:text-[18px]'>Track Your Child's Attendance with Ease</p>
          </div>
          
          <div className='flex gap-[8px]'>
            <button className='flex gap-1 items-center bg-white p-[6px] rounded-lg shadow-2xl shadow hover:shadow-md hover:shadow-[#003366] transition-shadow'>January <IoIosArrowDown/></button>
            <button className='flex gap-1 items-center bg-white p-[6px] rounded-lg shadow-2xl shadow hover:shadow-md hover:shadow-[#003366] transition-shadow'>2025 <IoIosArrowDown/></button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <AttendanceCalendar />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;