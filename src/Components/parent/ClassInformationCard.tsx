import { Building2, DoorOpen, UserRound } from 'lucide-react';
import type { ChildTimetable } from '../../services/parent.services';

/**
 * The child's class teacher, room and school, beside the timetable.
 *
 * @param props - Component props.
 * @param props.info - The class information the timetable route returns.
 * @returns The card.
 */
export default function ClassInformationCard({ info = {} }: { info?: Partial<ChildTimetable['classInformation']> }) {
  const rows = [
    { label: 'Class Teacher', value: info.classTeacher || 'Not assigned', icon: UserRound },
    { label: 'Room Number', value: info.roomNumber || 'N/A', icon: DoorOpen },
    { label: 'School', value: info.schoolName || 'School', icon: Building2 },
  ];

  return (
    <aside className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-extrabold text-[#101828] dark:text-slate-100">Class Information</h2>
      <div className="mt-5 space-y-4">
        {rows.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-3 text-sm font-semibold text-[#667085] dark:text-slate-400">
              <Icon className="h-5 w-5 shrink-0 text-[#667085] dark:text-slate-400" aria-hidden="true" /> {label}
            </span>
            <span className="text-right text-sm font-extrabold text-[#344054] dark:text-slate-200">{value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
