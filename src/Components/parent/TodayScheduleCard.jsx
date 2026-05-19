import React from "react";
import { Coffee } from "lucide-react";
import { formatTimeRange } from "./parentUtils";

export default function TodayScheduleCard({ schedule = [] }) {
  return (
    <aside className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-[#101828]">Today’s Schedule</h2>
      <p className="mt-1 text-sm text-[#667085]">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}</p>
      <div className="mt-5 space-y-4">
        {schedule.length ? schedule.map((slot, index) => (
          <div key={`${slot.startTime}-${index}`} className="grid grid-cols-[92px_1fr] gap-3">
            <p className="text-sm font-semibold text-[#667085]">{formatTimeRange(slot)}</p>
            <div className="border-l border-[#E5EAF2] pl-4">
              {slot.type === "break" ? (
                <p className="flex items-center gap-2 font-extrabold text-[#667085]"><Coffee className="h-4 w-4" /> {slot.title || "Break Time"}</p>
              ) : (
                <>
                  <p className="font-extrabold text-[#101828]">{slot.subjectName}</p>
                  <p className="mt-1 text-sm text-[#667085]">{slot.teacherName}</p>
                  <p className="text-sm text-[#667085]">{slot.room}</p>
                </>
              )}
            </div>
          </div>
        )) : <p className="text-sm text-[#667085]">No classes today.</p>}
      </div>
    </aside>
  );
}
