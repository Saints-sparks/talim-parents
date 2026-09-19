import { ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import type { LinkedChild } from '../../services/settings.services';
import { initialsOf } from '../profile/profileFormat';
import { SettingsCard } from './SettingsCard';

/**
 * The children linked to this parent, read-only — links are managed by the school.
 *
 * @param props - Component props.
 * @param props.items - The linked children.
 * @returns The card.
 */
export function LinkedChildrenCard({ items }: { items: LinkedChild[] }) {
  return (
    <SettingsCard
      title="My Children"
      guide="settings-children"
      subtitle={`${items.length} ${items.length === 1 ? 'child' : 'children'} linked to your account`}
    >
      <div className="divide-y divide-[#EEF2F7] dark:divide-slate-800">
        {items.length > 0 ? (
          items.map((child) => (
            <div key={child.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
              <Avatar className="h-11 w-11">
                {child.avatar ? (
                  <AvatarImage src={child.avatar} alt={child.fullName} />
                ) : (
                  <AvatarFallback className="bg-[#EAF2FB] font-bold text-[#003366] dark:bg-slate-700 dark:text-blue-200">
                    {initialsOf(child.fullName, 'C')}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#101828] dark:text-slate-100">{child.fullName}</p>
                <p className="mt-0.5 truncate text-xs text-[#667085] dark:text-slate-400">
                  {[child.grade, child.className].filter(Boolean).join(' · ')}
                </p>
                {child.schoolName && (
                  <p className="mt-0.5 truncate text-xs text-[#98A2B3] dark:text-slate-500">{child.schoolName}</p>
                )}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  child.status === 'Active'
                    ? 'bg-[#ECFDF3] text-[#067647] dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-[#FEF3F2] text-[#B42318] dark:bg-red-950/50 dark:text-red-300'
                }`}
              >
                {child.status}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-start gap-3 px-5 py-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#667085] dark:text-slate-400" aria-hidden="true" />
            <p className="text-sm text-[#667085] dark:text-slate-400">
              No children linked to your account. Please contact your school administrator.
            </p>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
