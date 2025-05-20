
import React, { useState, useEffect } from "react";
import { TbCalendarMonth, TbFileDownload, TbPlus } from "react-icons/tb";
import { IoMdTime } from "react-icons/io";
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { MdArrowBackIos, MdArrowForwardIos } from "react-icons/md";
import { useLeaveRequest } from "../hooks/useLeaveRequests";

function RequestLeave() {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(null);

  const navigate = useNavigate();

  // Use the hook that has the backend API functions
  const { getLeaveRequestsByChild, cancelRequest } = useLeaveRequest();

  // TODO: Replace with actual logged-in child's ID or prop
  const childId = "64aef4d2c7d2b7a91d12eabc"; // example

  // Fetch leave requests from backend for the child
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    async function fetchLeaveRequests() {
      try {
        if (isMounted) {
          setLoadingRequests(true);
          setErrorRequests(null);
        }
        
        const requests = await getLeaveRequestsByChild(childId);
        
        if (isMounted) {
          setLeaveRequests(requests);
          setLoadingRequests(false);
        }
      } catch (error) {
        if (isMounted) {
          setErrorRequests("Failed to load leave requests.");
          setLoadingRequests(false);
        }
      }
    }
    
    fetchLeaveRequests();

    // Cleanup function
    return () => {
      isMounted = false;
      cancelRequest(); // Cancel any ongoing request
    };
  }, [childId]); // Removed getLeaveRequestsByChild from dependencies

  // Rest of your component remains the same...
  const totalPages = Math.ceil(leaveRequests.length / rowsPerPage);
  const currentRequests = leaveRequests.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        status === "APPROVED"
          ? "bg-green-50 text-green-700"
          : status === "PENDING"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {status === "APPROVED" && <AiOutlineCheckCircle className="h-3.5 w-3.5" />}
      {status === "PENDING" && <IoMdTime className="h-3.5 w-3.5" />}
      {status === "REJECTED" && (
        <AiOutlineCloseCircle className="h-3.5 w-3.5" />
      )}
      {status}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Request Student Absence
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            Submit a leave request for your child's upcoming absence
          </p>
        </div>
        <button
          onClick={() => navigate("/leaveform")}
          className="fixed sm:relative bottom-6 right-6 sm:bottom-auto sm:right-auto z-10 sm:z-0 bg-[#003366] text-white rounded-full sm:rounded-lg shadow-lg sm:shadow-sm hover:bg-[#002855] transition-colors w-14 h-14 sm:w-auto sm:h-auto flex items-center justify-center sm:px-4 sm:py-2 sm:gap-2"
        >
          <TbPlus className="h-6 w-6 sm:hidden" />
          <TbCalendarMonth className="hidden sm:block h-5 w-5" />
          <span className="hidden sm:inline">New Request</span>
        </button>
      </div>

      {loadingRequests && (
        <p className="text-center text-gray-500">Loading leave requests...</p>
      )}
      {errorRequests && (
        <p className="text-center text-red-500">{errorRequests}</p>
      )}

      {!loadingRequests && !errorRequests && (
        <>
          {/* Desktop View */}
          <div className="hidden sm:block bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm text-gray-500">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(req.startDate).toLocaleDateString()} -{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {req.leaveType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003366]">
                        <TbFileDownload className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View - Cards */}
          <div className="sm:hidden space-y-4">
            {currentRequests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-lg shadow-sm p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(req.startDate).toLocaleDateString()} -{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">{req.leaveType}</span>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700">
                    <TbFileDownload className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="bg-white rounded-lg shadow-sm border-t border-gray-200 px-4 py-3 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page</span>
                  <select
                    className="rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1); // reset to page 1
                    }}
                  >
                    {[5, 10, 20, 50].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-sm text-gray-700">
                  Showing {currentPage * rowsPerPage - rowsPerPage + 1} -{" "}
                  {Math.min(currentPage * rowsPerPage, leaveRequests.length)} of{" "}
                  {leaveRequests.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <select
                    className="rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      )
                    )}
                  </select>
                  <span className="text-sm text-gray-700">of {totalPages}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <MdArrowBackIos className="h-5 w-5 text-gray-500" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <MdArrowForwardIos className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RequestLeave;
