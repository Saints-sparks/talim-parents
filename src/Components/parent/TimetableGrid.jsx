import React from "react";
import { Coffee } from "lucide-react";
import { formatTimeRange } from "./parentUtils";

const subjectStyles = [
  "bg-[#EAF2FF] text-[#0A4EA3]",
  "bg-[#EAF7EF] text-[#168044]",
  "bg-[#F3EAFE] text-[#6D28D9]",
  "bg-[#FFF5E6] text-[#A85C00]",
  "bg-[#FFF0F4] text-[#BE2454]",
  "bg-[#E9FAFB] text-[#0F766E]",
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableGrid({ slots = [], weekDays = days }) {
  const classSlots = slots.filter((slot) => slot.type !== "break");
  const breakSlot = slots.find((slot) => slot.type === "break");
  const timeSlots = [...new Set(classSlots.map((slot) => `${slot.startTime}-${slot.endTime}`))]
    .sort()
    .map((key) => {
      const [startTime, endTime] = key.split("-");
      return { startTime, endTime };
    });

  if (!classSlots.length && !breakSlot) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E5EAF2] bg-white shadow-sm">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[110px_repeat(6,minmax(130px,1fr))] border-b border-[#E5EAF2] bg-[#FBFCFE]">
          <div className="p-4 text-sm font-extrabold text-[#344054]">Time</div>
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-center text-sm font-extrabold text-[#344054]">{day.slice(0, 3)}</div>
          ))}
        </div>
        {timeSlots.map((time, rowIndex) => {
          const showBreak = breakSlot && time.startTime >= breakSlot.startTime && time.startTime < breakSlot.endTime;
          return (
            <div key={`${time.startTime}-${time.endTime}`} className="grid grid-cols-[110px_repeat(6,minmax(130px,1fr))] border-b border-[#EEF2F7] last:border-b-0">
              <div className="flex items-center justify-center border-r border-[#EEF2F7] p-3 text-center text-sm font-bold text-[#344054]">
                {time.startTime}<br />-<br />{time.endTime}
              </div>
              {showBreak ? (
                <div className="col-span-6 m-3 flex items-center justify-center gap-2 rounded-xl bg-[#F4F6F8] p-4 text-sm font-extrabold text-[#667085]">
                  <Coffee className="h-5 w-5" /> {breakSlot.title || "Break Time"}
                </div>
              ) : (
                weekDays.map((day, dayIndex) => {
                  const slot = classSlots.find((item) => item.day === day && item.startTime === time.startTime && item.endTime === time.endTime);
                  const tone = subjectStyles[(dayIndex + rowIndex) % subjectStyles.length];
                  return (
                    <div key={`${day}-${time.startTime}`} className="min-h-[96px] border-r border-[#EEF2F7] p-2 last:border-r-0">
                      {slot ? (
                        <div className={`flex h-full min-h-[76px] flex-col justify-center rounded-xl p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
                          <p className="text-sm font-extrabold">{slot.subjectName}</p>
                          <p className="mt-1 text-xs font-semibold opacity-85">{slot.teacherName}</p>
                          <p className="mt-1 text-xs opacity-80">{slot.room}</p>
                          <p className="mt-1 text-[11px] opacity-75">{formatTimeRange(slot)}</p>
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[76px] items-center justify-center text-[#98A2B3]">-</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
