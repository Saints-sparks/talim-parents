import { KeyRound, Link2Off, LogOut, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mailtoHref } from '../../lib/support';
import { useAuth } from '../../services/auth.services';
import ParentOnboardingLayout from './ParentOnboardingLayout';

/**
 * What a parent sees when no child is linked to their account: a link code
 * from the school office adds a child (A11), or who to write to, and a way to
 * sign out.
 *
 * @returns The empty state.
 */
export default function NoLinkedWardState() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  // No child means no school to ask yet: the Talim help desk.
  const contactHref = mailtoHref();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <ParentOnboardingLayout contactHref={contactHref}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[#F3F7FB] text-[#003366] dark:bg-[#1e2d47] dark:text-blue-300">
          <Link2Off className="h-12 w-12" />
        </div>

        <h1 className="text-xl font-bold text-[#030E18] dark:text-slate-100">No wards linked yet</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#5F6B7A] dark:text-slate-300">
          We couldn’t find any children linked to your account. Ask your child’s school office for a student link code, then enter it here.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings?tab=children')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#003366] px-4 text-sm font-semibold text-white hover:bg-[#002244] dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Enter a link code
          </button>
          <a
            href={contactHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#E6EAF0] bg-white px-4 text-sm font-semibold text-[#263442] hover:bg-[#F7F9FB] dark:border-[#2a3a5a] dark:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Contact Talim support
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#E6EAF0] bg-white px-4 text-sm font-semibold text-[#263442] hover:bg-[#F7F9FB] dark:border-[#2a3a5a] dark:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </ParentOnboardingLayout>
  );
}
