import React, { useState, useEffect } from 'react';
import { LuBookText } from "react-icons/lu";

function Result() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Sample result data
  const resultData = [
    { subject: 'Mathematics', testScore: 80, examScore: 90 },
    { subject: 'English Language', testScore: 70, examScore: 80 },
    { subject: 'Basic Science', testScore: 88, examScore: 92 },
    { subject: 'Social Studies', testScore: 82, examScore: 89 },
    { subject: 'Computer Studies', testScore: 78, examScore: 85 },
    { subject: 'Creative Arts', testScore: 85, examScore: 88 },
  ];

  // Function to calculate total score based on weightage
  const calculateTotalScore = (testScore, examScore) => {
    const testScoreWeightage = 0.3;
    const examScoreWeightage = 0.7;
    return ((testScore * testScoreWeightage) + (examScore * examScoreWeightage)).toFixed(2);
  };

  // Calculate totals
  const calculateTotalTestScore = () => {
    return resultData.reduce((acc, record) => acc + record.testScore, 0);
  };

  const calculateTotalExamScore = () => {
    return resultData.reduce((acc, record) => acc + record.examScore, 0);
  };

  const calculateTotalOverallScore = () => {
    return resultData.reduce((acc, record) => acc + (record.totalScore || parseFloat(calculateTotalScore(record.testScore, record.examScore))), 0);
  };

  // Function to export data as CSV
  const exportToCSV = () => {
    const header = ['Subject', 'Test Score (30%)', 'Exam Score (70%)', 'Total Score (100%)'];
    const rows = resultData.map(record => [
      record.subject,
      record.testScore,
      record.examScore,
      record.totalScore || calculateTotalScore(record.testScore, record.examScore),
    ]);

    const csvContent = [
      header.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'result.csv';
    link.click();
  };

  // Check if on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Mobile View
  if (isMobile) {
    return (
      <div className="flex flex-col p-4 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Results</h1>
            <p className="text-sm text-gray-500">Everything your teachers shared with you</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex gap-1 items-center text-white bg-blue-900 py-2 px-3 text-sm rounded-lg"
          >
            <img src="/import.svg" alt="" />
          </button>
        </div>
        
        {/* Subject Cards */}
        {resultData.map((item, index) => (
          <div key={index} className="mb-4 bg-white rounded-lg shadow p-4">
            <div className="font-medium text-gray-600 mb-2">Subject</div>
            <div className="font-bold mb-3 text-lg">{item.subject}</div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="text-gray-600 text-sm">Total Score (100%)</div>
                <div className="font-bold">{item.totalScore}</div>
              </div>
              <div></div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-600 text-sm">Test Score (30%)</div>
                <div className="font-bold">{item.testScore}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">Exam Score (70%)</div>
                <div className="font-bold">{item.examScore}</div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Total section */}
        <div className="bg-blue-900 text-white rounded-lg shadow p-4">
          <div className="font-bold mb-3 text-lg">Total</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-white text-sm">Total Score</div>
              <div className="font-bold">{calculateTotalOverallScore()}/{resultData.length * 100}</div>
            </div>
            <div>
              <div className="text-white text-sm">Test Score</div>
              <div className="font-bold">{calculateTotalTestScore()}</div>
            </div>
            <div>
              <div className="text-white text-sm">Exam Score</div>
              <div className="font-bold">{calculateTotalExamScore()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop View (original code)
  return (
    <div className="flex p-6 min-h-screen">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h1 className="text-[20px] font-semibold">Results</h1>
            <p className="mb-2 text-[18px] text-[#aaaaaa]">Everything your teachers shared with you</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex gap-1 items-center text-white bg-[#003366] py-[10px] px-[15px] rounded-lg shadow-lg transition-transform hover:scale-105"
          >
            Download
          </button>
        </div>

        {/* Results Table */}
        <div className="bg-white p-6 rounded-[10px] text-left text-[#030303] h-[528px] w-full max-w-[1094px] overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="font-semibold px-4 md:px-10 py-2 h-[62px]">Subject</th>
                <th className="font-semibold px-4 md:px-10 py-2 h-[62px]">Test Score (30%)</th>
                <th className="font-semibold px-4 md:px-10 py-2 h-[62px]">Exam Score (70%)</th>
                <th className="font-semibold px-4 md:px-10 py-2 h-[62px]">Total Score (100%)</th>
              </tr>
            </thead>
            <tbody>
              {resultData.map((record, index) => (
                <tr key={index}>
                  <td className="flex items-center gap-3 px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">
                    <LuBookText />
                    {record.subject}
                  </td>
                  <td className="px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">{record.testScore}</td>
                  <td className="px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">{record.examScore}</td>
                  <td className="px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">{record.totalScore || calculateTotalScore(record.testScore, record.examScore)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="font-semibold px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">Total</td>
                <td className="px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">{calculateTotalTestScore()}</td>
                <td className="px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">{calculateTotalExamScore()}</td>
                <td className="px-4 md:px-10 py-2 border-y border-gray-200 h-[62px]">{calculateTotalOverallScore()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Result;