import { Bell, CalendarCheck, ClipboardCheck, FileText, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ChildUpdate } from "../../services/parent.services";
import { formatDateTime } from "./parentUtils";

const iconMap: Record<string, LucideIcon> = {
  attendance: CalendarCheck,
  assignment: FileText,
  notice: Megaphone,
  result: ClipboardCheck,
  leave: Bell,
};

interface RecentUpdatesListProps {
  /** Latest first; only the first five are shown. */
  updates?: ChildUpdate[];
}

/**
 * The parent dashboard's "Recent Updates" card: the latest attendance and
 * result changes across every linked child.
 *
 * @param props - The updates to show.
 * @returns The card element.
 */
export default function RecentUpdatesList({ updates = [] }: RecentUpdatesListProps) {
  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-[#101828]">Recent Updates</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#EEF2F7]">
        {updates.length ? updates.slice(0, 5).map((update, index) => {
          const Icon = iconMap[update.type] || Bell;
          return (
            <div key={`${update.type}-${index}`} className="flex items-start gap-4 border-b border-[#EEF2F7] p-4 last:border-b-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#0A4EA3]">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[#101828]">{update.title}</p>
                <p className="mt-1 text-sm text-[#667085]">{update.description}</p>
                {update.childName && <p className="mt-1 text-xs font-bold text-[#0A4EA3]">{update.childName}</p>}
              </div>
              <time className="shrink-0 text-right text-xs font-semibold text-[#667085]">{formatDateTime(update.createdAt)}</time>
            </div>
          );
        }) : (
          <p className="p-6 text-sm text-[#667085]">No recent updates yet.</p>
        )}
      </div>
    </section>
  );
}
