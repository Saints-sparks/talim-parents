import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * A tappable row in a settings card: icon, label, one-line description and a chevron.
 *
 * @param props - Component props.
 * @param props.icon - The leading icon.
 * @param props.label - The row's title.
 * @param props.description - A short line under it.
 * @param props.onClick - Called when the row is chosen.
 * @returns The row.
 */
export function SettingsRow({
  icon,
  label,
  description,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EEF2F7] px-4 py-4 text-left last:border-b-0 hover:bg-[#F8FAFD] dark:border-slate-800 dark:hover:bg-slate-800/60"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F8FF] text-[#0A4EA3] dark:bg-slate-800 dark:text-blue-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#101828] dark:text-slate-100">{label}</p>
        {description && <p className="mt-0.5 truncate text-xs text-[#667085] dark:text-slate-400">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-[#98A2B3] dark:text-slate-500" aria-hidden="true" />
    </button>
  );
}
