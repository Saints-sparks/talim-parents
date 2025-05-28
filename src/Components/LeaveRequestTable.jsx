import React, { useState } from "react";
import { TbCalendarMonth, TbFileDownload } from "react-icons/tb";
import { IoMdTime } from "react-icons/io";
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import { MdArrowBackIos, MdArrowForwardIos } from "react-icons/md";
import jsPDF from "jspdf";

const LeaveRequestTable = ({ leaveRequests }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(4);

  const totalPages = Math.ceil(leaveRequests.length / rowsPerPage);
  const currentRequests = leaveRequests.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatLeavePeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return "";
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const StatusBadge = ({ status }) => {
    const s = status?.toUpperCase();
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
        ${
          s === "APPROVED"
            ? "bg-green-100 text-green-700"
            : s === "PENDING"
            ? "bg-yellow-100 text-yellow-700"
            : s === "FAILED"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-700"
        }`}
      >
        {s === "APPROVED" && <AiOutlineCheckCircle className="h-4 w-4" />}
        {s === "PENDING" && <IoMdTime className="h-4 w-4" />}
        {s === "FAILED" && <AiOutlineCloseCircle className="h-4 w-4" />}
        {s ? s.charAt(0) + s.slice(1).toLowerCase() : ""}
      </span>
    );
  };

  // PDF download handler
  const handleDownloadPDF = (request) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Leave Request Details", 14, 20);

    doc.setFontSize(12);
    doc.text(`Request Date: ${formatDate(request.createdAt)}`, 14, 40);
    doc.text(
      `Leave Period: ${formatLeavePeriod(request.startDate, request.endDate)}`,
      14,
      50
    );
    doc.text(`Leave Type: ${request.leaveType}`, 14, 60);
    doc.text(`Status: ${request.status}`, 14, 70);

    // Add more fields if needed, for example:
    if (request.reason) {
      doc.text(`Reason:`, 14, 80);
      doc.text(request.reason, 14, 90, { maxWidth: 180 });
    }

    doc.save(`leave-request-${request._id || Date.now()}.pdf`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {leaveRequests.length > 0 ? (
        <>
          <table className="w-full text-sm text-gray-500">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Period
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentRequests.map((req) => (
                <tr key={req._id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 whitespace-nowrap">{formatDate(req.createdAt)}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    {formatLeavePeriod(req.startDate, req.endDate)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">{req.leaveType}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleDownloadPDF(req)}
                      className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
                      title="Download Leave Request PDF"
                    >
                      <TbFileDownload size={20} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
                      setCurrentPage(1);
                    }}
                  >
                    {[4, 5, 10, 20].map((num) => (
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
                    aria-label="Previous page"
                  >
                    <MdArrowBackIos className="h-5 w-5 text-gray-500" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    <MdArrowForwardIos className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center">
          <TbCalendarMonth className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new leave request.
          </p>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestTable;
