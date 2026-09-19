import { Info } from 'lucide-react';
import type { School } from '../../services/school.services';
import { schoolAddress, schoolPhone } from './profileFormat';

/** One labelled value in the information lists. */
function InfoRow({ label, value, badge }: { label: string; value?: string; badge?: string }) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center">
      <p className="text-sm font-medium text-[#667085] dark:text-slate-400">{label}</p>
      <p className="min-w-0 break-words text-sm font-bold text-[#101828] dark:text-slate-100">{value || 'Not available'}</p>
      {badge && (
        <span className="inline-flex w-fit items-center rounded-full bg-[#E8F8EF] px-2.5 py-1 text-xs font-bold text-[#159947] dark:bg-emerald-950/50 dark:text-emerald-300">
          {badge}
        </span>
      )}
    </div>
  );
}

/**
 * The parent's own details and their school's, read-only. Email and phone are
 * labelled verified only when the API reports them verified.
 *
 * @param props - Component props.
 * @param props.fullName - The display name.
 * @param props.email - The account email.
 * @param props.emailVerified - Whether the email is verified.
 * @param props.phoneNumber - The phone number on file.
 * @param props.school - The parent's school, once loaded.
 * @param props.schoolLoading - The school request is in flight.
 * @param props.refreshing - Profile data is being refreshed in the background.
 * @returns The card.
 */
export function PersonalInfoCard({
  fullName,
  email,
  emailVerified,
  phoneNumber,
  school,
  schoolLoading,
  refreshing,
}: {
  fullName: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  school: School | undefined;
  schoolLoading: boolean;
  refreshing: boolean;
}) {
  const divider = 'divide-y divide-[#EEF2F7] dark:divide-slate-800';
  return (
    <section className="rounded-xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#101828] dark:text-slate-100">Personal Information</h2>
        {(refreshing || schoolLoading) && (
          <span className="text-xs font-semibold text-[#667085] dark:text-slate-400">Refreshing...</span>
        )}
      </div>

      <div className={`mt-5 ${divider}`}>
        <InfoRow label="Full Name" value={fullName} />
        <InfoRow label="Email Address" value={email} badge={emailVerified ? 'Verified' : undefined} />
        <InfoRow label="Phone Number" value={phoneNumber} />
      </div>

      <div className="my-5 h-px bg-[#EEF2F7] dark:bg-slate-800" />

      <h2 className="text-lg font-bold text-[#101828] dark:text-slate-100">School Information</h2>
      <div className={`mt-5 ${divider}`}>
        <InfoRow label="School Name" value={school?.name} />
        <InfoRow label="Address" value={schoolAddress(school)} />
        <InfoRow label="School Phone" value={schoolPhone(school)} />
      </div>

      <div className="mt-5 flex gap-3 rounded-lg bg-[#EEF6FF] p-4 text-sm text-[#0A4EA3] dark:bg-blue-950/40 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="font-semibold">Your email is managed by your school and cannot be changed here.</p>
      </div>
    </section>
  );
}
