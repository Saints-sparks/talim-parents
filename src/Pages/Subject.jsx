import React, { useState } from 'react';

// Import your images
import ppImage from '../images/pp.jpg';
import aImage from '../images/a.jpg';
import bImage from '../images/b.jpg';
import cImage from '../images/c.jpg';
import eImage from '../images/e.jpg';
import mImage from '../images/m.jpg';
import ceImage from '../images/ce.jpeg';
import mmImage from '../images/mm.jpg';


// Import teacher avatar images
import avatar1 from '../images/1.jpg';
import avatar2 from '../images/2.jpg';
import avatar3 from '../images/3.jpg';
import avatar4 from '../images/4.jpg';
import avatar5 from '../images/5.jpg';
import avatar6 from '../images/6.jpg';

function Subject() {
  // Create an array of subjects with the imported images
  const subjects = [
    { id: 1, image: mImage, teacherAvatar: avatar1, name: "Subject 1", teacherName: "Teacher 1" },
    { id: 2, image: eImage, teacherAvatar: avatar2, name: "Subject 2", teacherName: "Teacher 2" },
    { id: 3, image: bImage, teacherAvatar: avatar3, name: "Subject 3", teacherName: "Teacher 3" },
    { id: 4, image: ppImage, teacherAvatar: avatar4, name: "Subject 4", teacherName: "Teacher 4" },
    { id: 5, image: cImage, teacherAvatar: avatar5, name: "Subject 5", teacherName: "Teacher 5" },
    { id: 6, image: aImage, teacherAvatar: avatar6, name: "Subject 6", teacherName: "Teacher 6" },
    { id: 7, image: mmImage, teacherAvatar: avatar1, name: "Subject 7", teacherName: "Teacher 7" },
    { id: 8, image: ceImage, teacherAvatar: avatar2, name: "Subject 8", teacherName: "Teacher 8" },
  ];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const subjectsPerPage = 9; // Number of subjects per page

  // Calculate the range of subjects for the current page
  const indexOfLastSubject = currentPage * subjectsPerPage;
  const indexOfFirstSubject = indexOfLastSubject - subjectsPerPage;
  const currentSubjects = subjects.slice(indexOfFirstSubject, indexOfLastSubject);

  // Total pages
  const totalPages = Math.ceil(subjects.length / subjectsPerPage);

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 p-2">
        <h1 className="text-2xl mb-6">All Subjects</h1>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentSubjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Image Section */}
              <div className="h-48 overflow-hidden">
                <img
                  src={subject.image}
                  alt={subject.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content Section */}
              <div className="p-4">
                {/* Subject Name */}
                <h3 className="font-semibold text-lg mb-2">{subject.name}</h3>

                {/* Schedule */}
                <p className="text-gray-600 text-sm mb-4">Monday - Friday: 10:00am - 12:00pm</p>

                {/* Teacher Info */}
                <div className="flex items-center space-x-3">
                  {/* Teacher Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    <img
                      src={subject.teacherAvatar} // Using the imported avatar image
                      alt={subject.teacherName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Teacher Name */}
                  <p className="text-sm text-gray-700">{subject.teacherName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`px-4 py-2 rounded ${
                currentPage === index + 1
                  ? "bg-[#003366] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Subject;
