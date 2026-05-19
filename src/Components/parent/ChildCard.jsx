import React from "react";
import { ChevronRight, MoreVertical, School, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../lib/ui/avatar";
import { getChildId, getChildMeta, getChildName, getInitials } from "./parentUtils";

export default function ChildCard({ child, selected, onSelect, onViewProfile }) {
  const name = getChildName(child);

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${selected ? "border-[#7BA7F7] ring-1 ring-[#7BA7F7]" : "border-[#E5EAF2]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={child?.avatar || child?.userId?.userAvatar} alt={name} />
            <AvatarFallback className="bg-[#EAF2FB] text-xl font-bold text-[#003366]">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {selected && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-lg bg-[#EAF2FF] px-2 py-1 text-xs font-bold text-[#0A4EA3]">
                <Star className="h-3.5 w-3.5 fill-current" /> Primary Child
              </span>
            )}
            <h2 className="truncate text-xl font-extrabold text-[#101828]">{name}</h2>
            <p className="mt-1 text-sm font-semibold text-[#667085]">{getChildMeta(child)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#667085]">
              <School className="h-4 w-4" /> {child?.schoolName || "School not assigned"}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8F7EE] px-3 py-1 text-xs font-bold text-[#16A34A]">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" /> {child?.isActive === false ? "Inactive" : "Active"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onSelect?.(child)} className="rounded-lg p-2 text-[#667085] hover:bg-[#F4F8FF] hover:text-[#0A4EA3]" title="Set primary child">
            <Star className={`h-5 w-5 ${selected ? "fill-[#2F80ED] text-[#2F80ED]" : ""}`} />
          </button>
          <button type="button" className="rounded-lg p-2 text-[#667085] hover:bg-[#F4F8FF]" title="More actions">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#EEF2F7] pt-4 sm:grid-cols-4">
        <Metric label="Attendance" value={`${Math.round(child?.attendancePercentage || 0)}%`} accent="text-[#16A34A]" />
        <Metric label="Results" value={child?.currentGradeSummary || "N/A"} accent="text-[#0A4EA3]" />
        <Metric label="Subjects" value={child?.subjectsCount ?? 0} />
        <Metric label="Teachers" value={child?.teachersCount ?? 0} />
      </div>

      <button type="button" onClick={() => onViewProfile?.(getChildId(child))} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE5F2] bg-white px-4 py-3 text-sm font-extrabold text-[#0A4EA3] shadow-sm hover:bg-[#F4F8FF] sm:w-auto">
        View Profile <ChevronRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function Metric({ label, value, accent = "text-[#101828]" }) {
  return (
    <div className="min-w-0 border-r border-[#EEF2F7] last:border-r-0">
      <p className="text-xs font-bold text-[#667085]">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}
