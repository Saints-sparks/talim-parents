import { CheckCircle2 } from 'lucide-react';
import type { ParentChild } from '../../types/parent';
import { getAvatarUrl, getInitials, getPersonName, getStudentClassLabel } from './onboardingUtils';

/** Props of {@link WardCard}. */
interface WardCardProps {
  ward: ParentChild;
  selected: boolean;
  onSelect: (ward: ParentChild) => void;
}

/**
 * One linked child, as a selectable card.
 *
 * @param props - The child, whether it is the current choice, and the select callback.
 * @returns The card as a button.
 */
export default function WardCard({ ward, selected, onSelect }: WardCardProps) {
  const avatarUrl = getAvatarUrl(ward);
  const name = getPersonName(ward);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(ward)}
      className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
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
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#003366] dark:text-[#93c5fd]">
            {getInitials(ward)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#17212B] dark:text-slate-100">{name}</p>
        <p className="mt-1 text-xs text-[#657386] dark:text-slate-300">{getStudentClassLabel(ward)}</p>
        {ward.isActive !== undefined && (
          <span
            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              ward.isActive
                ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {ward.isActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>

      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1D66D1] dark:text-blue-400" />}
    </button>
  );
}
