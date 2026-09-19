import { Check, LockKeyhole } from 'lucide-react';
import { AvatarEditor } from './AvatarEditor';
import { initialsOf } from './profileFormat';

/** A label and its value on one line. */
function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-[#667085] dark:text-slate-400">{label}</span>
      <span className="text-right text-sm font-bold text-[#101828] dark:text-slate-100">{value}</span>
    </div>
  );
}

/**
 * The parent's identity card: photo (changeable and removable), name and a few
 * facts, with the change-password entry point.
 *
 * @param props - Component props.
 * @param props.fullName - The display name.
 * @param props.avatar - The photo URL.
 * @param props.emailVerified - Shows a "Verified" badge only when the API says so.
 * @param props.memberSince - A formatted date.
 * @param props.linkedCount - How many children are linked.
 * @param props.onChangePassword - Opens the password dialog.
 * @returns The card.
 */
export function ProfileCard({
  fullName,
  avatar,
  emailVerified,
  memberSince,
  linkedCount,
  onChangePassword,
}: {
  fullName: string;
  avatar?: string | null;
  emailVerified: boolean;
  memberSince: string;
  linkedCount: number;
  onChangePassword: () => void;
}) {
  return (
    <section className="rounded-xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-center text-center">
        <AvatarEditor src={avatar} name={fullName} initials={initialsOf(fullName)} showRemove />
        <h2 className="mt-4 break-words text-2xl font-bold text-[#101828] dark:text-slate-100">{fullName}</h2>
        <p className="mt-1 text-sm font-medium text-[#667085] dark:text-slate-400">Parent Account</p>
        {emailVerified && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#E8F8EF] px-2.5 py-1 text-xs font-bold text-[#159947] dark:bg-emerald-950/50 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Email verified
          </span>
        )}
      </div>

      <div className="my-6 h-px bg-[#EEF2F7] dark:bg-slate-800" />

      <div className="space-y-4">
        <Fact label="Member since" value={memberSince} />
        <Fact label="Account Type" value="Parent" />
        <Fact label="Linked Children" value={linkedCount} />
      </div>

      <button
        type="button"
        onClick={onChangePassword}
        className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#0A4EA3] hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
      >
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        Change Password
      </button>
    </section>
  );
}
