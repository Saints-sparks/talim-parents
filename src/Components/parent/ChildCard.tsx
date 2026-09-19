import { ChevronRight, School, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import { childFullName, type ParentChild } from '../../types/parent';
import { displayName, getChildMeta, getInitials } from './parentUtils';

/** A key figure under the child's name. */
function Metric({ label, value, accent = 'text-[#101828] dark:text-slate-100' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="min-w-0 border-r border-[#EEF2F7] last:border-r-0 dark:border-slate-800">
      <p className="text-xs font-bold text-[#667085] dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${accent}`}>{value}</p>
    </div>
  );
}

/** Props for {@link ChildCard}. */
interface ChildCardProps {
  child: ParentChild;
  /** The child the whole app is currently showing. */
  selected: boolean;
  /** The parent's default ("primary") child, as the server has it. */
  isPrimary: boolean;
  /** Disables the star while a change is being saved. */
  busy?: boolean;
  onSetPrimary: (child: ParentChild) => void;
  onViewProfile: () => void;
}

/**
 * One linked child on My Children: who they are, key figures, and the two
 * things a parent can do — make them the primary child, or open their profile.
 *
 * @param props - Component props.
 * @returns The card.
 */
export default function ChildCard({ child, selected, isPrimary, busy = false, onSetPrimary, onViewProfile }: ChildCardProps) {
  const name = displayName(childFullName(child));

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-slate-900 ${
        selected ? 'border-[#7BA7F7] ring-1 ring-[#7BA7F7] dark:border-blue-500/60 dark:ring-blue-500/40' : 'border-[#E5EAF2] dark:border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
            <AvatarImage src={child.avatar || child.userId?.userAvatar} alt={name} />
            <AvatarFallback className="bg-[#EAF2FB] text-xl font-bold text-[#003366] dark:bg-slate-800 dark:text-blue-300">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {isPrimary && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-lg bg-[#EAF2FF] px-2 py-1 text-xs font-bold text-[#0A4EA3] dark:bg-blue-950/60 dark:text-blue-300">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Primary Child
              </span>
            )}
            <h2 className="truncate text-xl font-extrabold text-[#101828] dark:text-slate-100">{name}</h2>
            <p className="mt-1 text-sm font-semibold text-[#667085] dark:text-slate-400">{getChildMeta(child)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#667085] dark:text-slate-400">
              <School className="h-4 w-4 shrink-0" aria-hidden="true" /> {child.schoolName || 'School not assigned'}
            </p>
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                child.isActive === false
                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  : 'bg-[#E8F7EE] text-[#16A34A] dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${child.isActive === false ? 'bg-slate-400' : 'bg-[#16A34A] dark:bg-emerald-400'}`}
                aria-hidden="true"
              />
              {child.isActive === false ? 'Inactive' : 'Active'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSetPrimary(child)}
          disabled={busy || isPrimary}
          aria-pressed={isPrimary}
          aria-label={isPrimary ? `${name} is the primary child` : `Make ${name} the primary child`}
          title={isPrimary ? 'Primary child' : 'Set primary child'}
          className="shrink-0 rounded-lg p-2 text-[#667085] hover:bg-[#F4F8FF] hover:text-[#0A4EA3] disabled:cursor-default disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
        >
          <Star className={`h-5 w-5 ${isPrimary ? 'fill-[#2F80ED] text-[#2F80ED]' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#EEF2F7] pt-4 sm:grid-cols-4 dark:border-slate-800">
        <Metric label="Attendance" value={`${Math.round(child.attendancePercentage || 0)}%`} accent="text-[#16A34A] dark:text-emerald-400" />
        <Metric label="Results" value={child.currentGradeSummary || 'N/A'} accent="text-[#0A4EA3] dark:text-blue-300" />
        <Metric label="Subjects" value={child.subjectsCount ?? 0} />
        <Metric label="Teachers" value={child.teachersCount ?? 0} />
      </div>

      <button
        type="button"
        onClick={onViewProfile}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE5F2] bg-white px-4 py-3 text-sm font-extrabold text-[#0A4EA3] shadow-sm hover:bg-[#F4F8FF] sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
      >
        View Profile <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </article>
  );
}
