import React, { useState } from "react";
import { TbCalendarMonth, TbFileDownload } from "react-icons/tb";
import { IoMdTime } from "react-icons/io";
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { MdArrowBackIos } from "react-icons/md";
import { MdArrowForwardIos } from "react-icons/md";



function RequestLeave() {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const leaveRequests = [
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Approved" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Pending" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Approved" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Pending" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Failed" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Approved" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Pending" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Failed" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Approved" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Pending" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Failed" },
    { requestDate: "Dec 28, 2024", leavePeriod: "Jan 3, 2025 - Jan 4, 2025", type: "Full Day", status: "Failed" },
  ];

  const totalPages = Math.ceil(leaveRequests.length / rowsPerPage);
  const currentRequests = leaveRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[25px] font-semibold">Request Student Absence</h1>
          <p className="text-[#aaaaaa]">Submit a leave request for your child's upcoming absence</p>
        </div>
        <button
          className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105"
          onClick={() => navigate("/leaveform")}
        >
          <TbCalendarMonth className="h-[24px] w-[24px]"/> New Request
        </button>
      </div>

      <div className="bg-white p-2 rounded-[10px]">
        <table className="w-full text-gray-500">
          <thead>
            <tr>
              <th className="p-3 font-semibold text-black text-left">Request Date</th>
              <th className="p-3 font-semibold text-black text-left">Leave Period</th>
              <th className="p-3 font-semibold text-black text-left">Type</th>
              <th className="p-3 font-semibold text-black text-left">Status</th>
              <th className="p-3 font-semibold text-black text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRequests.map((req, index) => (
              <tr key={index} className="border-t">
                <td className="p-3">{req.requestDate}</td>
                <td className="p-3">{req.leavePeriod}</td>
                <td className="p-3">{req.type}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center gap-2 px-2 py-1 text-sm font-semibold rounded-lg ${
                      req.status === "Approved"
                        ? "bg-[#e5f6f0] text-[#00513D]"
                        : req.status === "Pending"
                        ? "bg-[#FFF4E5] text-[#815B1D]"
                        : "bg-[#FFE5E5] text-[#B42318]"
                    }`}
                  >
                    {req.status === "Approved" && <AiOutlineCheckCircle size={16} />}
                    {req.status === "Pending" && <IoMdTime size={16} />}
                    {req.status === "Failed" && <AiOutlineCloseCircle size={16} />}
                    {req.status}
                  </span>
                </td>
                <td className="p-3">
                  <button className="flex text-[#141111] items-center gap-2 border px-3 py-1 rounded-lg hover:bg-gray-100">
                    <TbFileDownload /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="bg-white p-4 rounded-[10px] flex justify-between items-center">
        <div className="flex gap-16 items-center ">
          <div className="">
          <span>Rows per page</span>
          <select
            className="rounded px-2 py-1"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        <span className="text-[#979797]">
          Showing {currentPage * rowsPerPage - rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, leaveRequests.length)} of {leaveRequests.length}
        </span>
          </div>
          
        <div className="flex items-center gap-2">
          <select
            className="border rounded p-[5px]"
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
          <span>of page {totalPages}</span>
          
          <button disabled={currentPage === 1} className="px-3 py-1 rounded-lg disabled:opacity-50" onClick={() => setCurrentPage(currentPage - 1)}>
            <MdArrowBackIos size={20} />
          </button>
          <button disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg disabled:opacity-50" onClick={() => setCurrentPage(currentPage + 1)}>
            <MdArrowForwardIos size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestLeave;
