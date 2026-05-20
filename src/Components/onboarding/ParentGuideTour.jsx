import {
  Bell,
  CalendarCheck,
  CalendarDays,
  FileBadge,
  LayoutDashboard,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const TOUR_STEPS = {
  "/dashboard": [
    {
      title: "Dashboard overview",
      description: "See your selected ward, attendance summary, recent updates, and setup progress in one place.",
      icon: LayoutDashboard,
    },
    {
      title: "Ward switcher",
      description: "Use the child selector in the top bar to switch between linked wards anytime.",
      icon: UsersRound,
    },
  ],
  "/attendance": [
    {
      title: "Track Attendance Easily",
      description: "View daily, weekly, and monthly attendance records for your child.",
      icon: CalendarCheck,
    },
  ],
  "/timetable": [
    {
      title: "View Class Schedule",
      description: "Check upcoming classes and download the timetable when needed.",
      icon: CalendarDays,
    },
  ],
  "/result": [
    {
      title: "Review Academic Results",
      description: "See subject scores and exported result summaries shared by the school.",
      icon: FileBadge,
    },
  ],
  "/requestleave": [
    {
      title: "Request Leave",
      description: "Submit leave requests and follow approval status for your child.",
      icon: CalendarCheck,
    },
  ],
  "/messages": [
    {
      title: "Open Messages",
      description: "Read and reply to school or teacher conversations.",
      icon: MessageSquareText,
    },
  ],
  "/notifications": [
    {
      title: "Read Notifications",
      description: "Stay current with school announcements, alerts, and updates.",
      icon: Bell,
    },
  ],
};

const storageKey = (pathname) => `parent_guide_seen_${pathname}`;

export default function ParentGuideTour() {
  const location = useLocation();
  const steps = useMemo(() => TOUR_STEPS[location.pathname] || [], [location.pathname]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(() => {
    if (!steps.length) return false;
    return localStorage.getItem(storageKey(location.pathname)) !== "true";
  });

  useEffect(() => {
    setIndex(0);
    setOpen(Boolean(steps.length) && localStorage.getItem(storageKey(location.pathname)) !== "true");
  }, [location.pathname, steps.length]);

  if (!steps.length || !open) return null;

  const step = steps[index];
  const Icon = step.icon;

  const close = () => {
    localStorage.setItem(storageKey(location.pathname), "true");
    setOpen(false);
  };

  const next = () => {
    if (index === steps.length - 1) {
      close();
      return;
    }
    setIndex((current) => current + 1);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl dark:border dark:border-[#2a3a5a] dark:bg-[#1a2540]">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#EAF2FB] text-[#003366] dark:bg-[#1e2d47] dark:text-[#93c5fd]">
          <Icon className="h-12 w-12" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-[#030E18] dark:text-slate-100">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#657386] dark:text-slate-300">{step.description}</p>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={close} className="text-sm font-semibold text-[#657386] hover:text-[#003366] dark:text-slate-300 dark:hover:text-[#93c5fd]">
            Skip
          </button>
          <div className="flex gap-1.5">
            {steps.map((item, dotIndex) => (
              <span
                key={item.title}
                className={`h-2 w-2 rounded-full ${dotIndex === index ? "bg-[#003366]" : "bg-[#D7DEE8]"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex((current) => current - 1)}
                className="rounded-lg border border-[#E6EAF0] px-3 py-2 text-sm font-semibold text-[#263442] dark:border-[#2a3a5a] dark:text-slate-100"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002244]"
            >
              {index === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
