import { useState, type FormEvent } from 'react';
import { ApiError, getErrorMessage } from '../../lib/apiError';
import { useUpdateFullName } from '../../hooks/useParentSettings';
import { toast } from '../CustomToast';
import { AvatarEditor } from './AvatarEditor';
import { ModalShell } from './ModalShell';
import { initialsOf } from './profileFormat';
import { Field, INPUT_CLASS, PRIMARY_BUTTON, SECONDARY_BUTTON } from './formControls';

const READ_ONLY_CLASS =
  'h-11 w-full cursor-not-allowed rounded-lg border border-[#EEF2F7] bg-[#F9FAFB] px-4 text-sm text-[#98A2B3] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-500';

/**
 * Edits what a parent may change about themselves: their display name and photo.
 * The email is read-only (the school owns it) and the phone number is changed
 * through its own verified flow, which this dialog links to.
 *
 * @param props - Component props.
 * @param props.fullName - The current name.
 * @param props.email - The account email, shown read-only.
 * @param props.phoneNumber - The current phone number, shown read-only.
 * @param props.avatar - The current photo URL.
 * @param props.onClose - Called after saving or when dismissed.
 * @param props.onChangePhone - Opens the phone-change dialog.
 * @returns The dialog.
 */
export function EditProfileModal({
  fullName,
  email,
  phoneNumber,
  avatar,
  onClose,
  onChangePhone,
}: {
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string | null;
  onClose: () => void;
  onChangePhone: () => void;
}) {
  const [name, setName] = useState(fullName);
  const [nameError, setNameError] = useState<string>();
  const save = useUpdateFullName();

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Your name is required.');
      return;
    }
    if (trimmed === fullName) {
      onClose();
      return;
    }
    try {
      await save.mutateAsync(trimmed);
      toast.success('Profile updated successfully');
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        setNameError(error.fieldErrors().fullName ?? error.message);
      } else {
        toast.error(getErrorMessage(error, 'Could not update your profile.'));
      }
    }
  };

  return (
    <ModalShell title="Edit Profile" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="px-6 py-5">
        <AvatarEditor
          src={avatar}
          name={fullName}
          initials={initialsOf(fullName)}
          sizeClass="h-20 w-20"
          textClass="text-xl"
          showRemove
        />

        <div className="mt-5 space-y-4">
          <Field label="Full Name" htmlFor="edit-fullname" error={nameError}>
            <input
              id="edit-fullname"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setNameError(undefined);
                setName(event.target.value);
              }}
              placeholder="Enter your full name"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="Email Address" htmlFor="edit-email" hint="Email is managed by your school.">
            <input id="edit-email" type="email" value={email} readOnly className={READ_ONLY_CLASS} />
          </Field>

          <Field label="Phone Number" htmlFor="edit-phone">
            <input id="edit-phone" type="tel" value={phoneNumber ?? ''} readOnly className={READ_ONLY_CLASS} />
            <button
              type="button"
              onClick={onChangePhone}
              className="mt-1.5 text-xs font-semibold text-[#0A4EA3] hover:underline dark:text-blue-300"
            >
              Change phone number
            </button>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className={PRIMARY_BUTTON}>
            {save.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
