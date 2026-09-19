import type { ReactNode } from 'react';

/**
 * A titled card in the settings grid.
 *
 * @param props - Component props.
 * @param props.title - The card heading.
 * @param props.subtitle - A line under the heading.
 * @param props.action - A control shown at the right of the heading.
 * @param props.guide - The `data-guide` id the page tour points at, if any.
 * @param props.children - The card body.
 * @returns The card.
 */
export function SettingsCard({
  title,
  subtitle,
  action,
  guide,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  guide?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-guide={guide}
      className="rounded-xl border border-[#E5EAF2] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F7] px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#101828] dark:text-slate-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#667085] dark:text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
