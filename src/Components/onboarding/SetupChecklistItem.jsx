/* eslint-disable react/prop-types */
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";

export default function SetupChecklistItem({ icon, title, description, completed, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
        completed
          ? "border-transparent bg-green-50 dark:bg-[#042516]"
          : "border-[#E8EDF3] bg-white hover:border-[#B7C7DA] dark:border-[#2a3a5a] dark:bg-[#1a2540] dark:hover:border-[#3b4f75]"
      } ${disabled ? "cursor-default" : ""}`}
    >
      <span className={completed ? "text-green-600" : "text-[#8A98A8]"}>
        {completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </span>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        completed ? "bg-white text-green-600 dark:bg-[#0f1629] dark:text-green-400" : "bg-[#F2F6FB] text-[#003366] dark:bg-[#0e2040] dark:text-[#93c5fd]"
      }`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#17212B] dark:text-slate-100">{title}</span>
        <span className="block truncate text-xs text-[#657386] dark:text-slate-300">{description}</span>
      </span>
      {completed ? (
        <span className="hidden text-xs font-semibold text-green-700 sm:inline">Completed</span>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8A98A8]" />
      )}
    </button>
  );
}
