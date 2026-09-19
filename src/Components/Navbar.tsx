import { useEffect, useMemo } from 'react';
import { Bell, CalendarDays, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { ChildMenu } from './navbar/ChildMenu';
import { ProfileMenu } from './navbar/ProfileMenu';

const CONTROL =
  'border border-[#DCE5F2] bg-white shadow-sm hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800';

/**
 * The top bar of the signed-in shell: which child, the date, the unread bell
 * and the parent's menu. Picks the default child the first time the list loads.
 *
 * @returns The header.
 */
export default function Navbar() {
  const navigate = useNavigate();
  const { counts } = useNotifications();
  const { wards, wardsLoading } = useParentOnboarding();
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();

  const unreadCount = counts.unread;
  const today = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()),
    [],
  );

  useEffect(() => {
    if (!wardsLoading && wards.length > 0 && !selectedStudent) {
      updateSelectedStudent(wards.find((child) => child.isDefault) ?? wards[0]);
    }
  }, [selectedStudent, updateSelectedStudent, wards, wardsLoading]);

  return (
    <header className="sticky top-0 z-20 border-b border-[#E5EAF2] bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-h-[76px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ChildMenu
            wards={wards}
            loading={wardsLoading}
            selected={selectedStudent}
            onSelect={updateSelectedStudent}
          />
          <button
            type="button"
            onClick={() => navigate('/my-children')}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-[#344054] dark:text-slate-200 ${CONTROL}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add / Switch Child
          </button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div
            className={`hidden h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-[#344054] dark:text-slate-200 md:flex ${CONTROL}`}
          >
            <span>{today}</span>
            <CalendarDays className="h-4 w-4 text-[#667085] dark:text-slate-400" aria-hidden="true" />
          </div>

          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#344054] dark:text-slate-200 ${CONTROL}`}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
