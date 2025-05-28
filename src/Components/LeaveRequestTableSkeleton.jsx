import React from "react";
import SkeletonLoader from "./SkeletonLoader";

const LeaveRequestTableSkeleton = () => {
  const rowCount = 6; // Number of rows to show in skeleton
  return (
    <div className="overflow-auto max-h-96">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr>
            {["Request Date", "Leave Period", "Type", "Status", "Actions"].map((header) => (
              <th
                key={header}
                className="border border-gray-300 p-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rowCount)].map((_, i) => (
            <tr key={i} className="border-b border-gray-200">
              {[...Array(5)].map((__, j) => (
                <td key={j} className="border border-gray-300 p-3">
                  <SkeletonLoader type="custom" height="1rem" width="100%" className="rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaveRequestTableSkeleton;
