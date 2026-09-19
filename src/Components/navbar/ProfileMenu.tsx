import { useCallback, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import { useAuth } from '../../services/auth.services';
import { useDismiss } from './useDismiss';

/**
 * The parent's own menu: profile, settings and sign-out.
 *
 * @returns The trigger and its panel.
 */
export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const parentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Parent';
  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase();

  const go = (path: string): void => {
    close();
    navigate(path);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/');
  };

  const avatar = (size: string, text: string) => (
    <Avatar className={`${size} shrink-0`}>
      {user?.userAvatar ? (
        <AvatarImage src={user.userAvatar} alt={parentName} />
      ) : (
        <AvatarFallback className={`bg-[#F5E9E2] ${text} text-[#7A4B33] dark:bg-slate-700 dark:text-amber-200`}>
          {initials || <UserRound className="h-4 w-4" aria-hidden="true" />}
        </AvatarFallback>
      )}
    </Avatar>
  );

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#344054] hover:bg-[#F8FAFD] dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-[#DCE5F2] bg-white px-3 py-2 shadow-sm hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {avatar('h-9 w-9', 'text-sm font-bold')}
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-bold text-[#101828] dark:text-slate-100">{parentName}</span>
          <span className="block text-xs text-[#667085] dark:text-slate-400">Parent</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-[#667085] dark:text-slate-400 sm:block" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-xl border border-[#E5EAF2] bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-[#EEF2F7] px-4 py-3 dark:border-slate-800">
            {avatar('h-9 w-9', 'text-sm font-bold')}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#101828] dark:text-slate-100">{parentName}</p>
              <p className="text-xs text-[#667085] dark:text-slate-400">Parent Account</p>
            </div>
          </div>

          <div className="p-1.5">
            <button type="button" onClick={() => go('/profile')} className={itemClass}>
              <UserRound className="h-4 w-4 text-[#667085] dark:text-slate-400" aria-hidden="true" />
              View Profile
            </button>
            <button type="button" onClick={() => go('/settings')} className={itemClass}>
              <Settings className="h-4 w-4 text-[#667085] dark:text-slate-400" aria-hidden="true" />
              Settings
            </button>
            <div className="my-1 h-px bg-[#EEF2F7] dark:bg-slate-800" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
