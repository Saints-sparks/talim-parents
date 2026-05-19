import React from "react";
import { Building2, DoorOpen, UserRound } from "lucide-react";

export default function ClassInformationCard({ info = {} }) {
  const rows = [
    { label: "Class Teacher", value: info.classTeacher || "Not assigned", icon: UserRound },
    { label: "Room Number", value: info.roomNumber || "N/A", icon: DoorOpen },
    { label: "School", value: info.schoolName || "School", icon: Building2 },
  ];

  return (
    <aside className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-[#101828]">Class Information</h2>
      <div className="mt-5 space-y-4">
        {rows.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-3 text-sm font-semibold text-[#667085]">
              <Icon className="h-5 w-5 text-[#667085]" /> {label}
            </span>
            <span className="text-right text-sm font-extrabold text-[#344054]">{value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
