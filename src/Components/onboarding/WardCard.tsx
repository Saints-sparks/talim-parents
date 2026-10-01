import { CheckCircle2 } from 'lucide-react';
import type { ChildSummary } from '../../types/portal/children';
import { initialsOf } from '../../lib/format';
import { getStudentClassLabel } from './onboardingUtils';

/** Props of {@link WardCard}. */
interface WardCardProps {
  ward: ChildSummary;
  selected: boolean;
  onSelect: (ward: ChildSummary) => void;
}

/**
 * One linked child, as a selectable card: photo or initials, name, class and
 * school.
 *
 * @param props - The child, whether it is the current choice, and the select callback.
 * @param props.ward - The child.
 * @param props.selected - Whether this is the current choice.
 * @param props.onSelect - Called with the child when the card is chosen.
 * @returns The card as a button.
 */
export default function WardCard({ ward, selected, onSelect }: WardCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(ward)}
      className={`flex min-h-[44px] w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D66D1] ${
        selected
          ? 'border-[#1D66D1] bg-[#F7FAFF] dark:border-blue-400 dark:bg-blue-500/10'
          : 'border-[#E8EDF3] bg-white hover:border-[#B7C7DA] dark:border-[#2a3a5a] dark:bg-[#1a2540] dark:hover:border-[#3b4f75]'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? 'border-[#1D66D1] bg-[#1D66D1] dark:border-blue-400 dark:bg-blue-400' : 'border-[#A7B1BE] dark:border-slate-500'
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#EAF2FB] dark:bg-[#1e2d47]">
        {ward.avatarUrl ? (
          <img src={ward.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#003366] dark:text-[#93c5fd]">
            {initialsOf(ward.name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#17212B] dark:text-slate-100">{ward.name}</p>
        <p className="mt-1 text-xs text-[#5B6B80] dark:text-slate-300">{getStudentClassLabel(ward)}</p>
      </div>

      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1D66D1] dark:text-blue-400" aria-hidden="true" />}
    </button>
  );
}
