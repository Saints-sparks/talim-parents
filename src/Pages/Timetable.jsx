import React, { useState, useEffect } from 'react';
import { FiDownload, FiPlus, FiEdit2, FiTrash2, FiX, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import AttendanceTimetable from '../Components/AttendanceTimetable';
import { useTimetable } from '../services/timetable.services';

function Timetable() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTimetable, setCurrentTimetable] = useState(null);
  const [classId, setClassId] = useState(null);
  const [formData, setFormData] = useState({
    classId: "",
    courseId: "",
    day: "Monday",
    startTime: "",
    endTime: ""
  });
  const [notification, setNotification] = useState({
    show: false,
    type: '', // 'success' or 'error'
    message: ''
  });

  const {
    timetables,
    loading,
    error,
    getTimetableByClass,
    createTimetable,
    updateTimetable,
    deleteTimetable
  } = useTimetable();

  // Show notification and auto-hide after 5 seconds
  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Get classId from localStorage when component mounts
  useEffect(() => {
    const parentStudents = JSON.parse(localStorage.getItem('parent_students') || '[]');
    if (parentStudents.length > 0) {
      const selectedStudent = parentStudents[0];
      setClassId(selectedStudent?.classId?._id);
      setFormData(prev => ({ ...prev, classId: selectedStudent?.classId?._id }));
      getTimetableByClass(selectedStudent?.classId?._id);
    }
  }, []);

  const handleAddNew = () => {
    setCurrentTimetable(null);
    setFormData({
      classId: classId,
      courseId: "",
      day: "Monday",
      startTime: "",
      endTime: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (timetable) => {
    setCurrentTimetable(timetable);
    setFormData({
      classId: classId,
      courseId: timetable.courseId,
      day: timetable.day,
      startTime: timetable.startTime,
      endTime: timetable.endTime
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this timetable entry?")) {
      const success = await deleteTimetable(id);
      if (success) {
        showNotification('success', 'Timetable entry deleted successfully');
        getTimetableByClass(classId);
      } else {
        showNotification('error', 'Failed to delete timetable entry');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const timetableData = {
      classId: formData.classId,
      courseId: formData.courseId,
      day: formData.day,
      startTime: formData.startTime,
      endTime: formData.endTime
    };

    try {
      let success = false;
      let message = '';
      
      if (currentTimetable) {
        success = await updateTimetable(currentTimetable._id, timetableData);
        message = success ? 'Timetable updated successfully' : 'Failed to update timetable';
      } else {
        success = await createTimetable(timetableData);
        message = success ? 'Timetable created successfully' : 'Failed to create timetable';
      }

      if (success) {
        showNotification('success', message);
        setIsModalOpen(false);
        getTimetableByClass(classId);
      } else {
        showNotification('error', message);
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="flex min-h-screen p-6 flex-col gap-6 relative">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <FiCheckCircle className="mr-2 text-xl" />
          ) : (
            <FiAlertCircle className="mr-2 text-xl" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-[20px]'>Timetable</h1>
          <p className='text-[#aaaaaa] text-[18px]'>Stay on Track with Your Class Schedule!</p>
        </div>
      
        <div className='flex space-x-3 mt-auto'>
          <button 
            className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105"
            onClick={handleAddNew}
          >
            Add Timetable <FiPlus/>
          </button>
          <button 
            className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105">
            Download <FiDownload/>
          </button>
        </div>
      </div>

      {/* Attendance Section */}
      <div className="">
        <AttendanceTimetable 
          onEdit={handleEdit}
          onDelete={handleDelete}
          timetables={timetables}
          loading={loading}
          error={error}
        />
      </div>

      {/* Right-side Modal (50% width) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-1/2 h-full overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {currentTimetable ? 'Edit Timetable' : 'Add New Timetable'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-6">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class ID</label>
                  <input
                    type="text"
                    name="classId"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-500"
                    value={formData.classId}
                    readOnly
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course ID</label>
                  <input
                    type="text"
                    name="courseId"
                    placeholder="Enter course ID"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 text-gray-900"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    required
                  />
                  {error?.includes('course') && (
                    <p className="mt-1 text-sm text-red-600">Please check the course ID</p>
                  )}
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select
                    name="day"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 text-gray-900"
                    value={formData.day}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 text-gray-900"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400 text-gray-900"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : currentTimetable ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Timetable