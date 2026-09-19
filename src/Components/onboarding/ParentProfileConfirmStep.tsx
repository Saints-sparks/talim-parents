import { ArrowRight, Camera, Info, Loader2, UserRound } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import { useSchool } from '../../hooks/useSchool';
import { useParentOnboarding } from '../../contexts/ParentOnboardingContext';
import { useAuth } from '../../services/auth.services';
import ParentOnboardingLayout from './ParentOnboardingLayout';
import { getInitials, getPersonName } from './onboardingUtils';

/**
 * A read-only label and value.
 *
 * @param props - Component props.
 * @param props.label - What the value is.
 * @param props.value - The value to show.
 * @returns The field.
 */
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[#7B8794] dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#17212B] dark:text-slate-100">{value}</p>
    </div>
  );
}

/**
 * Step 1 of onboarding: the parent reviews the details the school holds for
 * them. Name, email and phone are shown read-only; the photo can be changed
 * when the deployment has an image host.
 *
 * @returns The confirmation screen.
 */
export default function ParentProfileConfirmStep() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { data: school, isLoading: schoolLoading } = useSchool();
  const { markStepComplete } = useParentOnboarding();
  const { canUpload, busy, changePhoto } = useAvatarUpload();

  const parentName = getPersonName(user);
  const avatarUrl = user?.userAvatar || '';

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Clearing the input lets the same file be picked again after a failure.
    event.target.value = '';
    if (file) void changePhoto(file);
  };

  return (
    <ParentOnboardingLayout stepLabel="Step 1 of 8">
      <div>
        <h1 className="text-xl font-bold text-[#030E18] dark:text-slate-100">Let’s confirm your profile</h1>
        <p className="mt-2 text-sm text-[#657386] dark:text-slate-300">Please review your information to continue.</p>

        <section className="mt-6 rounded-lg border border-[#E8EDF3] bg-white p-4 dark:border-[#2a3a5a] dark:bg-[#1a2540] sm:p-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#EAF2FB] dark:bg-[#1e2d47]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={parentName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[#003366] dark:text-[#93c5fd]">
                  {user ? getInitials(user) : <UserRound className="h-9 w-9" />}
                </div>
              )}
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40" role="status" aria-label="Uploading photo">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              {canUpload && (
                <>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-[#003366] text-white shadow-sm disabled:opacity-60 dark:border-[#1a2540]"
                    aria-label="Upload parent avatar"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>

            <div className="grid w-full flex-1 gap-4 sm:grid-cols-2">
              <InfoField label="Full name" value={parentName} />
              <InfoField label="Email address" value={user?.email || 'Not set'} />
              <InfoField label="Phone number" value={user?.phoneNumber || 'Not set'} />
              <InfoField
                label="School"
                value={schoolLoading ? 'Loading...' : school?.name || user?.schoolName || 'School not set'}
              />
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-lg bg-[#F2F6FB] px-3 py-3 text-xs text-[#184674] dark:bg-[#0e2040] dark:text-[#93c5fd]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Some profile details are managed by your school and cannot be changed here.</span>
          </div>
        </section>

        <button
          type="button"
          onClick={() => markStepComplete('parent-profile')}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#003366] text-sm font-semibold text-white hover:bg-[#002244] dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </ParentOnboardingLayout>
  );
}
