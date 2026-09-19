import { Check, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import { initialsOf } from '../profile/profileFormat';
import { SettingsCard } from './SettingsCard';

/**
 * The parent's name, contact details and verification state, with an entry
 * point to edit them.
 *
 * @param props - Component props.
 * @param props.fullName - The display name.
 * @param props.email - The account email.
 * @param props.phoneNumber - The phone number on file.
 * @param props.avatar - The photo URL.
 * @param props.emailVerified - Whether the API has verified the email.
 * @param props.onEdit - Opens the edit dialog.
 * @returns The card.
 */
export function ProfileSummaryCard({
  fullName,
  email,
  phoneNumber,
  avatar,
  emailVerified,
  onEdit,
}: {
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string | null;
  emailVerified: boolean;
  onEdit: () => void;
}) {
  return (
    <SettingsCard
      title="Profile Information"
      guide="settings-profile"
      action={
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center rounded-lg border border-[#DCE5F2] bg-white px-3 text-xs font-bold text-[#0A4EA3] hover:bg-[#F4F8FF] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          Edit Profile
        </button>
      }
    >
      <div className="flex items-start gap-4 px-5 py-5">
        <Avatar className="h-16 w-16 shrink-0 border-2 border-[#DCE5F2] dark:border-slate-700">
          {avatar ? (
            <AvatarImage src={avatar} alt={fullName} />
          ) : (
            <AvatarFallback className="bg-[#F5E9E2] text-xl font-bold text-[#7A4B33] dark:bg-slate-700 dark:text-amber-200">
              {initialsOf(fullName)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="break-words text-base font-bold text-[#101828] dark:text-slate-100">{fullName}</p>
          <p className="mt-0.5 break-all text-sm text-[#667085] dark:text-slate-400">{email}</p>
          <p className="mt-0.5 text-sm text-[#667085] dark:text-slate-400">{phoneNumber || 'No phone number'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF6FF] px-2.5 py-1 text-xs font-bold text-[#0A4EA3] dark:bg-blue-950/50 dark:text-blue-300">
              <User className="h-3 w-3" aria-hidden="true" />
              Parent
            </span>
            {emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-bold text-[#067647] dark:bg-emerald-950/50 dark:text-emerald-300">
                <Check className="h-3 w-3" aria-hidden="true" />
                Email verified
              </span>
            )}
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
