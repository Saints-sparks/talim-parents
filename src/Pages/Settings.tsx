import { useEffect, useState } from 'react';
import { Bell, ChevronRight, HelpCircle, Info, Lock, LogOut, Phone, SunMoon } from 'lucide-react';
import { useAuth } from '../services/auth.services';
import { useTheme } from '../contexts/ThemeContext';
import { useParentSettings, useSaveTheme } from '../hooks/useParentSettings';
import { ErrorState, messageForError } from '../Components/StateComponents';
import { toast } from '../Components/CustomToast';
import { PushNotificationToggle } from '../Components/notifications/PushNotificationToggle';
import { ChangePasswordModal } from '../Components/profile/ChangePasswordModal';
import { ChangePhoneModal } from '../Components/profile/ChangePhoneModal';
import { EditProfileModal } from '../Components/profile/EditProfileModal';
import { HelpSupportModal, AboutTalimModal } from '../Components/settings/InfoModals';
import { LinkedChildrenCard } from '../Components/settings/LinkedChildrenCard';
import { NotificationPreferencesModal } from '../Components/settings/NotificationPreferencesModal';
import { ProfileSummaryCard } from '../Components/settings/ProfileSummaryCard';
import { SettingsCard } from '../Components/settings/SettingsCard';
import { SettingsRow } from '../Components/settings/SettingsRow';
import { SettingsSkeleton } from '../Components/settings/SettingsSkeleton';
import { ThemePreferenceModal } from '../Components/settings/ThemePreferenceModal';
import { THEME_OPTIONS } from '../Components/settings/themeOptions';
import type { ThemePreference } from '../services/settings.services';

type ModalName = 'editProfile' | 'changePassword' | 'changePhone' | 'notifications' | 'theme' | 'help' | 'about';

const ICON = 'h-4 w-4';

/**
 * The parent's settings: profile, linked children, security, preferences and help.
 *
 * Everything shown comes from `GET /parent/settings` (cached, and refreshed
 * after each change). Security actions each have their own verified flow; there
 * is no two-factor or language control because the API has no endpoint for
 * either. The saved theme is applied on load so it follows the parent across
 * devices.
 *
 * @returns The page.
 */
export default function Settings() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const settings = useParentSettings();
  const saveTheme = useSaveTheme();
  const [modal, setModal] = useState<ModalName | null>(null);
  const close = (): void => setModal(null);

  const savedTheme = settings.data?.preferences.theme;
  useEffect(() => {
    if (savedTheme) setTheme(savedTheme);
  }, [savedTheme, setTheme]);

  if (settings.isPending) return <SettingsSkeleton />;
  if (settings.isError) {
    return (
      <ErrorState
        error={settings.error}
        onRetry={() => void settings.refetch()}
        title="Couldn't load your settings"
      />
    );
  }

  const { profile, children, preferences } = settings.data;
  const fullName = profile.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Parent';
  const avatar = profile.avatar || user?.userAvatar || null;
  const theme: ThemePreference = preferences.theme ?? 'system';
  const themeLabel = THEME_OPTIONS.find((option) => option.value === theme)?.label ?? 'System Default';

  const handleSaveTheme = (next: ThemePreference): void => {
    const previous = theme;
    setTheme(next); // Apply straight away; put it back if the server refuses.
    saveTheme.mutate(next, {
      onSuccess: () => {
        toast.success('Theme preference saved');
        close();
      },
      onError: (error) => {
        setTheme(previous);
        toast.error(messageForError(error, 'Could not save your theme.'));
      },
    });
  };

  return (
    <main className="mx-auto w-full max-w-7xl">
      {modal === 'editProfile' && (
        <EditProfileModal
          fullName={fullName}
          email={profile.email}
          phoneNumber={profile.phoneNumber}
          avatar={avatar}
          onClose={close}
          onChangePhone={() => setModal('changePhone')}
        />
      )}
      {modal === 'changePassword' && <ChangePasswordModal onClose={close} />}
      {modal === 'changePhone' && <ChangePhoneModal currentPhone={profile.phoneNumber} onClose={close} />}
      {modal === 'notifications' && <NotificationPreferencesModal onClose={close} />}
      {modal === 'theme' && (
        <ThemePreferenceModal currentTheme={theme} saving={saveTheme.isPending} onClose={close} onSave={handleSaveTheme} />
      )}
      {modal === 'help' && <HelpSupportModal onClose={close} />}
      {modal === 'about' && <AboutTalimModal onClose={close} />}

      <div data-guide="settings-header" className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828] dark:text-slate-100 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
          Manage your account, security and app preferences.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ProfileSummaryCard
            fullName={fullName}
            email={profile.email || user?.email || ''}
            phoneNumber={profile.phoneNumber}
            avatar={avatar}
            emailVerified={profile.isEmailVerified}
            onEdit={() => setModal('editProfile')}
          />
          <LinkedChildrenCard items={children} />
        </div>

        <div className="space-y-5">
          <SettingsCard title="Security" guide="settings-security">
            <SettingsRow
              icon={<Lock className={ICON} />}
              label="Change Password"
              description="Update your account password"
              onClick={() => setModal('changePassword')}
            />
            <SettingsRow
              icon={<Phone className={ICON} />}
              label="Change Phone Number"
              description="Update your registered phone number"
              onClick={() => setModal('changePhone')}
            />
          </SettingsCard>

          <SettingsCard title="Preferences" guide="settings-preferences">
            <SettingsRow
              icon={<Bell className={ICON} />}
              label="Notification Preferences"
              description="Choose what updates you want to receive"
              onClick={() => setModal('notifications')}
            />
            <SettingsRow
              icon={<SunMoon className={ICON} />}
              label="Theme"
              description={themeLabel}
              onClick={() => setModal('theme')}
            />
            <div className="border-b border-[#EEF2F7] px-4 py-1 last:border-b-0 dark:border-slate-800">
              <PushNotificationToggle />
            </div>
          </SettingsCard>

          <SettingsCard title="General">
            <SettingsRow
              icon={<HelpCircle className={ICON} />}
              label="Help & Support"
              description="Get help and contact support"
              onClick={() => setModal('help')}
            />
            <SettingsRow
              icon={<Info className={ICON} />}
              label="About Talim"
              description="Version, platform and support"
              onClick={() => setModal('about')}
            />
          </SettingsCard>

          <section className="rounded-xl border border-[#FECDCA] bg-white shadow-sm dark:border-red-900/40 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => void logout()}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-4 py-4 text-left hover:bg-[#FEF3F2] dark:hover:bg-red-950/30"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3F2] text-[#B42318] dark:bg-red-950/50 dark:text-red-300">
                <LogOut className={ICON} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#B42318] dark:text-red-300">Logout</p>
                <p className="mt-0.5 text-xs text-[#667085] dark:text-slate-400">Sign out of your account</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#98A2B3]" aria-hidden="true" />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
