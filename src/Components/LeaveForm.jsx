import React from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { IoIosArrowBack } from "react-icons/io";


function LeaveForm() {
 return (
   <div className="flex min-h-screen">
     <div className="flex-1 p-6 mr-6">
       <IoIosArrowBack className='w-7 h-7 mb-0'/>
       <h1 className="text-[25px] font-semibold">Request Student Absence</h1>
       <p className="text-[#aaaaaa] mb-6">Submit a leave request for your child's upcoming absence</p>
       <div className="grid grid-cols-2 gap-6">
         <div>
           <label className="block mb-2 text-sm font-medium text-gray-700">Start Date</label>
           <input
             type="text"
             placeholder="dd/mm/yy"
             className="border-gray-300 rounded-md px-3 py-2 w-full"
           />
         </div>
         <div>
           <label className="block mb-2 text-sm font-medium text-gray-700">End Date</label>
           <input
             type="text"
             placeholder="dd/mm/yy"
             className="border-gray-300 rounded-md px-3 py-2 w-full"
           />
         </div>
       </div>
       <div className="mt-6">
         <label className="block mb-2 text-sm font-medium text-gray-700">Leave Type</label>
         <div className="relative">
           <select className="border-gray-300 rounded-md px-3 py-2 w-full appearance-none">
             <option>e.g health issue</option>
           </select>
           <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
             <FaChevronDown className="h-5 w-5 text-gray-400" />
           </div>
         </div>
       </div>
       <div className="mt-6">
         <label className="block mb-2 text-sm font-medium text-gray-700">Reason for Absence</label>
         <textarea
           className="border-gray-300 rounded-md px-3 py-2 w-full"
           placeholder="Please provide details about the absence"
           rows={3}
         />
       </div>
       <div className="mt-6">
         <label className="block mb-2 text-sm font-medium text-gray-700">Support Documents (Optional)</label>
         <div className="flex items-center justify-between border-gray-300 border rounded-md px-3 py-2">
         <button className="text-[#003366] hover:text-blue-800">Choose file</button>
           <span>No file chosen</span>
         </div>
         <p>Upload any relevant documents (medical certificates, appointment letters, etc.)</p>
       </div>
     </div>
     <div className="flex-1 flex items-end justify-end p-6 mb-20">
       <button className="bg-[#003366] text-white font-medium py-2 px-4 rounded-md">
         Submit Leave Request
       </button>
     </div>
   </div>
 );
}

export default LeaveForm;