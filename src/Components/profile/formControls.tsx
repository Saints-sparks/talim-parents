import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Shared input styling for the account dialogs, in both themes. */
export const INPUT_CLASS =
  'h-11 w-full rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm text-[#101828] placeholder:text-[#98A2B3] focus:border-[#0A4EA3] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

/** The secondary (cancel/back) button. */
export const SECONDARY_BUTTON =
  'h-10 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

/** The primary (save/confirm) button. */
export const PRIMARY_BUTTON =
  'h-10 rounded-lg bg-[#0A4EA3] px-5 text-sm font-bold text-white hover:bg-[#083D82] disabled:cursor-not-allowed disabled:opacity-60';

/**
 * A labelled field with an optional hint and a validation message tied to the
 * input for screen readers.
 *
 * @param props - Component props.
 * @param props.label - The visible label.
 * @param props.htmlFor - The input's id.
 * @param props.error - A validation message to show under the input.
 * @param props.hint - Helper text shown when there is no error.
 * @param props.children - The input.
 * @returns The field.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#344054] dark:text-slate-200" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

/**
 * A password box with a show/hide toggle.
 *
 * @param props - Input attributes plus the label and an optional error.
 * @param props.label - The visible label.
 * @param props.error - A validation message.
 * @returns The field.
 */
export function PasswordField({
  label,
  error,
  ...input
}: { label: string; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${INPUT_CLASS} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[#98A2B3] hover:text-[#667085] dark:hover:text-slate-300"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}
