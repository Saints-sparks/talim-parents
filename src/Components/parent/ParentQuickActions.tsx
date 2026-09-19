import { BarChart3, CalendarCheck, ChevronRight, MessageSquare, Table2, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACTIONS: ReadonlyArray<{ label: string; description: string; href: string; icon: LucideIcon }> = [
  { label: 'View Attendance', description: 'Check daily and monthly attendance', href: '/attendance', icon: CalendarCheck },
  { label: 'View Timetable', description: "See your child's class schedule", href: '/timetable', icon: Table2 },
  { label: 'View Results', description: 'Check academic performance', href: '/result', icon: BarChart3 },
  { label: 'Message Teachers', description: 'Communicate with teachers', href: '/messages', icon: MessageSquare },
];

/**
 * Shortcuts from My Children to the pages a parent uses most.
 *
 * @returns The card.
 */
export default function ParentQuickActions() {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-extrabold text-[#101828] dark:text-slate-100">Quick Actions</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#EEF2F7] dark:border-slate-800">
        {ACTIONS.map(({ label, description, href, icon: Icon }) => (
          <button
            key={href}
            type="button"
            onClick={() => navigate(href)}
            className="flex w-full items-center gap-3 border-b border-[#EEF2F7] p-4 text-left last:border-b-0 hover:bg-[#F8FAFD] dark:border-slate-800 dark:hover:bg-slate-800/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#0A4EA3] dark:bg-blue-950/60 dark:text-blue-300">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-[#101828] dark:text-slate-100">{label}</span>
              <span className="block text-sm text-[#667085] dark:text-slate-400">{description}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#667085] dark:text-slate-400" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
