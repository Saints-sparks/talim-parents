import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../services/auth.services';
import { getParentByUserId, setDefaultChild } from '../services/parent.services';
import { useSchool } from '../hooks/useSchool';
import { useParentSettings } from '../hooks/useParentSettings';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { queryKeys, staleTimes } from '../lib/queryKeys';
import { childFullName, childRecordId, type ParentChild } from '../types/parent';
import { toast } from '../Components/CustomToast';
import { messageForError } from '../Components/StateComponents';
import { AccountSupportCard } from '../Components/profile/AccountSupportCard';
import { ChangePasswordModal } from '../Components/profile/ChangePasswordModal';
import { ChangePhoneModal } from '../Components/profile/ChangePhoneModal';
import { ConnectedChildren } from '../Components/profile/ConnectedChildren';
import { EditProfileModal } from '../Components/profile/EditProfileModal';
import { PersonalInfoCard } from '../Components/profile/PersonalInfoCard';
import { ProfileCard } from '../Components/profile/ProfileCard';
import { formatLongDate } from '../Components/profile/profileFormat';

type ModalName = 'edit' | 'password' | 'phone';

/** The parent record as `GET /parents/user/:id` returns it; only the join date is read here. */
interface ParentRecord {
  createdAt?: string;
}

/**
 * The parent's profile: identity, contact details, school, and linked children.
 *
 * Identity comes from `GET /parent/settings` (the same source as the Settings
 * page, so the two never disagree). The email is read-only; the name, photo,
 * password and phone number are changed through the same dialogs Settings
 * uses, each persisting on the server. Choosing a child here makes them the
 * default on the server as well as on this device.
 *
 * @returns The page.
 */
export default function Profile() {
  const { user, parentId } = useAuth();
  const queryClient = useQueryClient();
  const settings = useParentSettings();
  const { data: school, isLoading: schoolLoading } = useSchool();
  const { wards, wardsLoading, refreshWards } = useParentOnboarding();
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();
  const [modal, setModal] = useState<ModalName | null>(null);
  const [refreshingChildren, setRefreshingChildren] = useState(false);
  const close = (): void => setModal(null);

  const parentRecord = useQuery({
    queryKey: [...queryKeys.settings.parent(parentId || 'anon'), 'record'],
    queryFn: () => getParentByUserId<ParentRecord>(parentId),
    enabled: Boolean(parentId),
    staleTime: staleTimes.reference,
  });

  const profile = settings.data?.profile;
  const fullName =
    profile?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Parent';
  const email = profile?.email || user?.email || '';
  const phoneNumber = profile?.phoneNumber || user?.phoneNumber;
  const avatar = profile?.avatar || user?.userAvatar || null;
  const emailVerified = profile?.isEmailVerified === true;

  const handleSelectDefault = async (child: ParentChild): Promise<void> => {
    const id = childRecordId(child);
    if (!id) return;
    try {
      await setDefaultChild(id);
      updateSelectedStudent(child);
      void queryClient.invalidateQueries({ queryKey: queryKeys.children.list(parentId || 'anon') });
      toast.success(`${childFullName(child)} is now your default child.`);
    } catch (error) {
      toast.error(messageForError(error, 'Could not change your default child.'));
    }
  };

  const handleRefreshChildren = async (): Promise<void> => {
    setRefreshingChildren(true);
    try {
      await refreshWards();
      toast.info('Linked children refreshed.');
    } catch (error) {
      toast.error(messageForError(error, 'Could not refresh your children.'));
    } finally {
      setRefreshingChildren(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl">
      {modal === 'edit' && (
        <EditProfileModal
          fullName={fullName}
          email={email}
          phoneNumber={phoneNumber}
          avatar={avatar}
          onClose={close}
          onChangePhone={() => setModal('phone')}
        />
      )}
      {modal === 'password' && <ChangePasswordModal onClose={close} />}
      {modal === 'phone' && <ChangePhoneModal currentPhone={phoneNumber} onClose={close} />}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828] dark:text-slate-100 sm:text-3xl">My Profile</h1>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
            Manage your personal information and account settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal('edit')}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-bold text-[#101828] shadow-sm hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          Edit Profile
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)_360px]">
        <ProfileCard
          fullName={fullName}
          avatar={avatar}
          emailVerified={emailVerified}
          memberSince={formatLongDate(parentRecord.data?.createdAt)}
          linkedCount={wards.length}
          onChangePassword={() => setModal('password')}
        />
        <PersonalInfoCard
          fullName={fullName}
          email={email}
          emailVerified={emailVerified}
          phoneNumber={phoneNumber}
          school={school}
          schoolLoading={schoolLoading}
          refreshing={settings.isFetching || parentRecord.isFetching}
        />
        <AccountSupportCard schoolEmail={school?.email} />
      </div>

      <ConnectedChildren
        wards={wards}
        loading={wardsLoading}
        selectedId={childRecordId(selectedStudent)}
        refreshing={refreshingChildren}
        onRefresh={() => void handleRefreshChildren()}
        onSelect={(child) => void handleSelectDefault(child)}
      />
    </main>
  );
}
