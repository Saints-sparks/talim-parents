import { ChevronRight, Star, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import { childFullName, childRecordId, type ParentChild } from '../../types/parent';
import { initialsOf } from './profileFormat';

/** One linked child; choosing it makes them the default. */
function ChildRow({ child, isDefault, onSelect }: { child: ParentChild; isDefault: boolean; onSelect: () => void }) {
  const name = childFullName(child) || 'Unnamed child';
  const photo = child.avatar || child.userId?.userAvatar;
  const active = child.isActive !== false;
  const meta = [child.grade, child.className].filter(Boolean).join(' - ') || 'Class not assigned';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EEF2F7] px-3 py-4 text-left last:border-b-0 hover:bg-[#F8FAFD] dark:border-slate-800 dark:hover:bg-slate-800/60 sm:px-4"
    >
      <Avatar className="h-12 w-12">
        {photo ? (
          <AvatarImage src={photo} alt={name} />
        ) : (
          <AvatarFallback className="bg-[#EAF2FB] font-bold text-[#003366] dark:bg-slate-700 dark:text-blue-200">
            {initialsOf(name, 'C')}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#101828] dark:text-slate-100">{name}</p>
        <p className="mt-1 truncate text-xs font-medium text-[#667085] dark:text-slate-400">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${
            active
              ? 'bg-[#E8F8EF] text-[#159947] dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-[#FEF3F2] text-[#B42318] dark:bg-red-950/50 dark:text-red-300'
          }`}
        >
          {active ? 'Active' : 'Inactive'}
          {isDefault ? ' (Default)' : ''}
        </span>
        {isDefault && <Star className="h-4 w-4 fill-[#FDB022] text-[#FDB022]" aria-label="Default child" />}
        <ChevronRight className="h-5 w-5 text-[#667085] dark:text-slate-500" aria-hidden="true" />
      </div>
    </button>
  );
}

/**
 * The children linked to the parent, with the default marked. Linking another
 * child is done by the school, so there is no control for it here — only the
 * sentence that says so.
 *
 * @param props - Component props.
 * @param props.wards - The linked children.
 * @param props.loading - The list is still loading.
 * @param props.selectedId - The record id of the current default.
 * @param props.refreshing - A refresh is in flight.
 * @param props.onRefresh - Reloads the list.
 * @param props.onSelect - Called with the child chosen as default.
 * @returns The section.
 */
export function ConnectedChildren({
  wards,
  loading,
  selectedId,
  refreshing,
  onRefresh,
  onSelect,
}: {
  wards: ParentChild[];
  loading: boolean;
  selectedId: string | undefined;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (child: ParentChild) => void;
}) {
  return (
    <section className="mt-5 rounded-xl border border-[#E5EAF2] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#101828] dark:text-slate-100">Connected Children</h2>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
            Tap a child to make them your default. Your school links children to your account.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#0A4EA3] hover:bg-[#F8FAFD] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#E5EAF2] dark:border-slate-800">
        {loading ? (
          <div className="flex items-center gap-3 px-4 py-6 text-sm font-semibold text-[#667085] dark:text-slate-400" role="status">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            Loading linked children...
          </div>
        ) : wards.length > 0 ? (
          wards.map((child) => {
            const id = childRecordId(child);
            return (
              <ChildRow key={id} child={child} isDefault={Boolean(id) && id === selectedId} onSelect={() => onSelect(child)} />
            );
          })
        ) : (
          <div className="px-4 py-6 text-sm text-[#667085] dark:text-slate-400">
            No children are linked to this parent account yet.
          </div>
        )}
      </div>
    </section>
  );
}
