import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import ChildSwitcher from '../parent/ChildSwitcher';
import { displayName, getChildMeta, getInitials } from '../parent/parentUtils';
import { childFullName, type ParentChild } from '../../types/parent';

/**
 * Who the timetable is for, with a switcher when the parent has several
 * children.
 *
 * @param props - Component props.
 * @param props.child - The child shown.
 * @param props.wards - Every linked child.
 * @param props.onChange - Switches the child the whole app shows.
 * @returns The card.
 */
export default function SelectedChildCard({
  child,
  wards,
  onChange,
}: {
  child: ParentChild;
  wards: ParentChild[];
  onChange: (child: ParentChild) => void;
}) {
  const name = displayName(childFullName(child));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[#E5EAF2] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={child.avatar || child.userId?.userAvatar} alt={name} />
          <AvatarFallback className="bg-[#EAF2FB] font-extrabold text-[#003366] dark:bg-slate-800 dark:text-blue-300">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate font-extrabold text-[#101828] dark:text-slate-100">{name}</h2>
          <p className="text-sm font-semibold text-[#667085] dark:text-slate-400">{getChildMeta(child)}</p>
          {child.schoolName && <p className="text-sm text-[#667085] dark:text-slate-400">{child.schoolName}</p>}
        </div>
      </div>
      {wards.length > 1 && (
        <ChildSwitcher children={wards} selectedChild={child} onChange={(next) => next && onChange(next)} />
      )}
    </section>
  );
}
