import { useState, type FormEvent } from 'react';
import { useAuth } from '../../services/auth.services';
import { ApiError, getErrorMessage } from '../../lib/apiError';
import { validatePasswordChange, type FieldMessages } from '../../lib/accountRules';
import { toast } from '../CustomToast';
import { ModalShell } from './ModalShell';
import { PasswordField, PRIMARY_BUTTON, SECONDARY_BUTTON } from './formControls';

/**
 * Changes the parent's password.
 *
 * Goes through the auth context, which adopts the rotated access token the API
 * returns — a plain request would leave the session on a token the server has
 * just retired. Strength rules are checked here first; a wrong current password
 * is reported under its own field.
 *
 * @param props - Component props.
 * @param props.onClose - Called after success or when dismissed.
 * @returns The dialog.
 */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldMessages>({});
  const [saving, setSaving] = useState(false);

  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const found = validatePasswordChange(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await changePassword(form);
      toast.success('Password updated successfully');
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
        setErrors({ currentPassword: 'That is not your current password.' });
      } else if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        setErrors({ newPassword: error.fieldErrors().newPassword ?? error.message });
      } else {
        toast.error(getErrorMessage(error, 'Could not update your password.'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Change Password" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4 px-6 py-5">
        <PasswordField
          label="Current Password"
          autoComplete="current-password"
          placeholder="Enter current password"
          error={errors.currentPassword}
          {...bind('currentPassword')}
        />
        <PasswordField
          label="New Password"
          autoComplete="new-password"
          placeholder="8+ characters, upper/lower case, number, symbol"
          error={errors.newPassword}
          {...bind('newPassword')}
        />
        <PasswordField
          label="Confirm New Password"
          autoComplete="new-password"
          placeholder="Re-enter new password"
          error={errors.confirmPassword}
          {...bind('confirmPassword')}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
