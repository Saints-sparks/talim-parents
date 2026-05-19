import React from "react";
import { BookOpen, CalendarCheck, Medal, UsersRound } from "lucide-react";

const cards = [
  { key: "averageAttendance", label: "Average Attendance", icon: CalendarCheck, suffix: "%", tone: "bg-[#E8F7EE] text-[#16A34A]" },
  { key: "averageGrade", label: "Average Grade", icon: BookOpen, suffix: "", tone: "bg-[#F2EAFE] text-[#7E22CE]" },
  { key: "totalChildren", label: "Total Children", icon: UsersRound, suffix: "", tone: "bg-[#EAF2FF] text-[#0A4EA3]" },
  { key: "totalSubjects", label: "Total Subjects", icon: Medal, suffix: "", tone: "bg-[#FFF3E4] text-[#EA7A0A]" },
];

export default function ChildrenOverviewCards({ overview = {} }) {
  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-[#101828]">Overview (All Children)</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, suffix, tone }) => (
          <div key={key} className="flex items-center gap-4 rounded-xl border border-[#E5EAF2] bg-white p-4">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#667085]">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-[#101828]">{overview[key] ?? 0}{suffix}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
