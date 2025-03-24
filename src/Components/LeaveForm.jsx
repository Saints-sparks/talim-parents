import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';

function LeaveForm() {
  const navigate = useNavigate(); 
  const [selectedFile, setSelectedFile] = useState(null); // Fixed useState syntax

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file.name); // Store file name
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:space-x-6">
          {/* Left Section */}
          <div className="flex-1 py-6">
            {/* Back Button */}
            <div className="flex items-center mb-4">
              <button onClick={() => navigate(-1)} className="focus:outline-none">
                <IoIosArrowBack className="w-6 h-6 md:w-7 md:h-7 text-[#003366] hover:text-[#002244]" />
              </button>
            </div>
            
            <h1 className="text-xl md:text-[25px] font-semibold mb-2">Request Student Absence</h1>
            <p className="text-[#aaaaaa] mb-6 text-sm md:text-base">Submit a leave request for your child's upcoming absence</p>
            
            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Start Date</label>
                <input 
                  type="date" 
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">End Date</label>
                <input 
                  type="date" 
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
            </div>

            {/* Leave Type */}
            <div className="mt-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">Leave Type</label>
              <div className="relative">
                <select 
                  defaultValue="" 
                  className="border border-gray-300 rounded-md px-3 py-2 w-full appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>Select Leave Type</option>
                  <option>Health Issue</option>
                  <option>Family Emergency</option>
                  <option>Vacation</option>
                  <option>Personal Leave</option>
                  <option>Other</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <FaChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Reason for Absence */}
            <div className="mt-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">Reason for Absence</label>
              <textarea 
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Please provide details about the absence" 
                rows={3} 
              />
            </div>

            {/* Support Documents (File Upload) */}
            <div className="mt-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">Support Documents (Optional)</label>
              <div className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2">
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                
                {/* Custom Button to Trigger File Input */}
                <label htmlFor="file-upload" className="text-[#003366] hover:text-blue-800 text-sm cursor-pointer">
                  Choose file
                </label>

                {/* Display Selected File Name */}
                <span className="text-sm text-gray-500">
                  {selectedFile ? selectedFile : "No file chosen"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Upload any relevant documents (medical certificates, appointment letters, etc.)
              </p>
            </div>
          </div>

          {/* Submit Button Section */}
          <div className="fixed bottom-0 left-0 right-0 bg-white p-4 md:relative md:p-0 md:mt-auto border-t md:border-0 md:flex md:justify-end">
            <button className="w-full md:w-auto bg-[#003366] text-white font-medium py-2 px-6 rounded-md hover:bg-[#002244] transition-colors">
              Submit Leave Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaveForm;
