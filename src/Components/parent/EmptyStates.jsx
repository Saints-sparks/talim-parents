import React from "react";
import { Baby, CalendarX } from "lucide-react";

export function EmptyChildrenState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#C9D7EA] bg-white p-10 text-center">
      <Baby className="mx-auto h-12 w-12 text-[#0A4EA3]" />
      <h2 className="mt-4 text-xl font-extrabold text-[#101828]">No children linked yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#667085]">We couldn’t find any children linked to your account. Please contact your school administrator.</p>
      <button className="mt-6 rounded-xl bg-[#003366] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A4EA3]">Contact School Admin</button>
    </div>
  );
}

export function EmptyTimetableState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#C9D7EA] bg-white p-10 text-center">
      <CalendarX className="mx-auto h-12 w-12 text-[#0A4EA3]" />
      <h2 className="mt-4 text-xl font-extrabold text-[#101828]">No timetable available</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#667085]">No timetable has been published for this child yet.</p>
    </div>
  );
}
