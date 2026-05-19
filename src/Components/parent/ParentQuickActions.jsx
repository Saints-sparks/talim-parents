import React from "react";
import { BarChart3, CalendarCheck, ChevronRight, MessageSquare, Table2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { label: "View Attendance", description: "Check daily and monthly attendance", href: "/attendance", icon: CalendarCheck },
  { label: "View Timetable", description: "See your child's class schedule", href: "/timetable", icon: Table2 },
  { label: "View Results", description: "Check academic performance", href: "/result", icon: BarChart3 },
  { label: "Message Teachers", description: "Communicate with teachers", href: "/messages", icon: MessageSquare },
];

export default function ParentQuickActions() {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-[#101828]">Quick Actions</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#EEF2F7]">
        {actions.map(({ label, description, href, icon: Icon }) => (
          <button key={href} type="button" onClick={() => navigate(href)} className="flex w-full items-center gap-3 border-b border-[#EEF2F7] p-4 text-left last:border-b-0 hover:bg-[#F8FAFD]">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#0A4EA3]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-[#101828]">{label}</span>
              <span className="block text-sm text-[#667085]">{description}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#667085]" />
          </button>
        ))}
      </div>
    </section>
  );
}
