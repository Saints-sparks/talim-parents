import { BookOpen, CalendarCheck, Medal, UsersRound, type LucideIcon } from 'lucide-react';

/** The figures the overview card shows; strings cover the "N/A" grade. */
export interface OverviewFigures {
  averageAttendance?: number | string;
  averageGrade?: number | string;
  totalChildren?: number | string;
  totalSubjects?: number | string;
}

const CARDS: ReadonlyArray<{ key: keyof OverviewFigures; label: string; icon: LucideIcon; suffix: string; tone: string }> = [
  { key: 'averageAttendance', label: 'Average Attendance', icon: CalendarCheck, suffix: '%', tone: 'bg-[#E8F7EE] text-[#16A34A] dark:bg-emerald-950/50 dark:text-emerald-300' },
  { key: 'averageGrade', label: 'Average Grade', icon: BookOpen, suffix: '', tone: 'bg-[#F2EAFE] text-[#7E22CE] dark:bg-purple-950/50 dark:text-purple-300' },
  { key: 'totalChildren', label: 'Total Children', icon: UsersRound, suffix: '', tone: 'bg-[#EAF2FF] text-[#0A4EA3] dark:bg-blue-950/60 dark:text-blue-300' },
  { key: 'totalSubjects', label: 'Total Subjects', icon: Medal, suffix: '', tone: 'bg-[#FFF3E4] text-[#EA7A0A] dark:bg-orange-950/50 dark:text-orange-300' },
];

/**
 * The four headline figures across every linked child.
 *
 * @param props - Component props.
 * @param props.overview - The figures.
 * @returns The card.
 */
export default function ChildrenOverviewCards({ overview = {} }: { overview?: OverviewFigures }) {
  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-extrabold text-[#101828] dark:text-slate-100">Overview (All Children)</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(({ key, label, icon: Icon, suffix, tone }) => (
          <div
            key={key}
            className="flex items-center gap-4 rounded-xl border border-[#E5EAF2] bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#667085] dark:text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-[#101828] dark:text-slate-100">
                {overview[key] ?? 0}
                {suffix}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
