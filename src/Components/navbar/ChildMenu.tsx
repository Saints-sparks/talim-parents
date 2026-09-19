import { useCallback, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import { childFullName, childRecordId, type ParentChild } from '../../types/parent';
import { useDismiss } from './useDismiss';

/**
 * The class line under a child's name.
 *
 * @param child - The child.
 * @returns e.g. "Grade 4 • 4A", or a placeholder when no class is assigned.
 */
function childMeta(child: ParentChild): string {
  return [child.grade, child.className].filter(Boolean).join(' • ') || 'Class not assigned';
}

/** A child's photo, or their initials. */
function ChildAvatar({ child, className }: { child: ParentChild | null; className: string }) {
  const photo = child?.avatar || child?.userId?.userAvatar;
  const name = childFullName(child);
  const initials = (name.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'C').toUpperCase();
  return (
    <Avatar className={className}>
      {photo ? (
        <AvatarImage src={photo} alt={name} />
      ) : (
        <AvatarFallback className="bg-[#EAF2FB] text-xs font-bold text-[#003366] dark:bg-slate-700 dark:text-blue-200">
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

/**
 * The dropdown that switches which child the whole portal is showing.
 *
 * @param props - Component props.
 * @param props.wards - The parent's linked children.
 * @param props.loading - The list is still loading.
 * @param props.selected - The current child.
 * @param props.onSelect - Called with the child the parent chose.
 * @returns The trigger and its panel.
 */
export function ChildMenu({
  wards,
  loading,
  selected,
  onSelect,
}: {
  wards: ParentChild[];
  loading: boolean;
  selected: ParentChild | null;
  onSelect: (child: ParentChild) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const selectedId = childRecordId(selected);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-xl border border-[#DCE5F2] bg-white px-3 py-2 text-left shadow-sm hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <ChildAvatar child={selected} className="h-10 w-10 shrink-0" />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#101828] dark:text-slate-100">
            {loading ? 'Loading...' : childFullName(selected) || 'Select child'}
          </span>
          <span className="block text-xs text-[#667085] dark:text-slate-400">
            {selected ? childMeta(selected) : 'No child selected'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#667085] dark:text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#E5EAF2] bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-slate-400">
            Switch Child
          </p>
          <div className="max-h-72 overflow-y-auto p-1.5 pt-0">
            {wards.length > 0 ? (
              wards.map((child) => {
                const id = childRecordId(child);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onSelect(child);
                      close();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F4F8FF] dark:hover:bg-slate-800"
                  >
                    <ChildAvatar child={child} className="h-9 w-9 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#101828] dark:text-slate-100">
                        {childFullName(child)}
                      </span>
                      <span className="block truncate text-xs text-[#667085] dark:text-slate-400">
                        {childMeta(child)}
                      </span>
                    </span>
                    {id && id === selectedId && (
                      <Check className="h-4 w-4 shrink-0 text-[#0A4EA3] dark:text-blue-300" aria-label="Selected" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-[#667085] dark:text-slate-400">
                {loading ? 'Loading children...' : 'No linked children'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
