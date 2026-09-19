import type { ReactNode } from 'react';

/** Props for {@link KpiCard}. */
interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  /** A caption under the value. */
  sub?: string | null;
  /** Background classes for the icon tile. */
  accent: string;
}

/**
 * One headline figure at the top of the results page.
 *
 * @param props - Component props.
 * @returns The card.
 */
export default function KpiCard({ icon, label, value, sub, accent }: KpiCardProps) {
  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={`rounded-lg p-2 ${accent} dark:bg-slate-800`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-base font-bold leading-tight text-gray-800 dark:text-slate-100">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}
