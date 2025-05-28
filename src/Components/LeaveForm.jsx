import React, { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useLeaveRequest } from "../hooks/useLeaveRequests";
import { useTerm } from "../hooks/useTerm";

function LeaveForm() {
  const navigate = useNavigate();
  const { createNewLeaveRequest } = useLeaveRequest();
  const { currentTerm, loading: termLoading, error: termError } = useTerm();

  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate required fields
    if (!startDate || !endDate || !leaveType || !reason) {
      setError("Please fill in all required fields.");
      return;
    }

    if (termLoading) {
      setError("Loading current term... please wait.");
      return;
    }

    if (!currentTerm || !currentTerm._id) {
      setError("Current academic term not found. Cannot submit leave request.");
      return;
    }

    setLoading(true);

    try {
      const parentStudents = JSON.parse(localStorage.getItem("parent_students") || "[]");
      if (parentStudents.length === 0) throw new Error("No child found");

      const childId = parentStudents[0].userId?._id;
      if (!childId) throw new Error("Child ID not found");

      const leaveRequestData = {
        child: childId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        leaveType,
        reason,
        attachments: selectedFile ? [selectedFile.name] : [],
        term: currentTerm._id,
      };

      await createNewLeaveRequest(leaveRequestData);

      setSuccessMessage("Leave request submitted successfully! Redirecting...");

      setTimeout(() => {
        navigate("/requestleave");
      }, 2500);
    } catch (err) {
      setError(err.message || "Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  if (termError) {
    return <p className="text-red-600 p-4">Error loading term info: {termError}</p>;
  }

  if (termLoading) {
    return <p className="p-4">Loading current academic term...</p>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:space-x-6">
          <div className="flex-1 py-6">
            <div className="flex items-center mb-4">
              <button onClick={() => navigate(-1)} className="focus:outline-none">
                <IoIosArrowBack className="w-6 h-6 md:w-7 md:h-7 text-[#003366] hover:text-[#002244]" />
              </button>
            </div>

            <h1 className="text-xl md:text-[25px] font-semibold mb-2">Request Student Absence</h1>
            <p className="text-[#aaaaaa] mb-6 text-sm md:text-base">
              Submit a leave request for your child's upcoming absence
            </p>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">Leave Type</label>
                <div className="relative">
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="" disabled>
                      Select Leave Type
                    </option>
                    <option key="health" value="Health Issue">Health Issue</option>
                    <option key="family" value="Family Event">Family Event</option>
                    <option key="fees" value="Fees Issue">Fees Issue</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <FaChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">Reason for Absence</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please provide details about the absence"
                  rows={3}
                  required
                />
              </div>

              <div className="mt-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">Support Documents (Optional)</label>
                <div className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2">
                  <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} />
                  <label
                    htmlFor="file-upload"
                    className="text-[#003366] hover:text-blue-800 text-sm cursor-pointer"
                  >
                    Choose file
                  </label>
                  <span className="text-sm text-gray-500">{selectedFile ? selectedFile.name : "No file chosen"}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload any relevant documents (medical certificates, appointment letters, etc.)
                </p>
              </div>

              <div className="fixed bottom-0 left-0 right-0 bg-white p-4 md:relative md:p-0 md:mt-auto border-t md:border-0 md:flex md:justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto bg-[#003366] text-white font-medium py-2 px-6 rounded-md hover:bg-[#002244] transition-colors"
                >
                  {loading ? "Submitting..." : "Submit Leave Request"}
                </button>
              </div>

              {error && <p className="mt-4 text-red-600">{error}</p>}
              {successMessage && <p className="mt-4 text-green-600">{successMessage}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaveForm;
