import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft, Paperclip, Loader2, X } from 'lucide-react';
import { useTerm } from '../hooks/useTerm';
import { useCreateLeaveRequest } from '../hooks/useLeaveRequests';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';
import { uploadFile } from '../services/upload.services';
import { LEAVE_TYPES, type LeaveType } from '../services/leaveRequest.services';
import { ApiError } from '../lib/apiError';
import { logger } from '../lib/logger';
import { childFullName, childRecordId, type ParentChild } from '../types/parent';
import { ErrorState, LoadingState, messageForError } from './StateComponents';
import { toast } from './CustomToast';

/** Today as `YYYY-MM-DD`, for the date inputs' `min`. */
const today = (): string => new Date().toISOString().slice(0, 10);

/** The per-field problems the form can raise before the server sees them. */
type FieldErrors = Partial<Record<'startDate' | 'endDate' | 'leaveType' | 'reason' | 'child', string>>;

/**
 * Validates the form the way the server does, so a parent is told what is
 * wrong before a round trip rather than after one.
 *
 * @param values - The current form values.
 * @returns One message per bad field; empty when the form is good.
 */
function validate(values: {
  child: string | undefined;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.child) errors.child = 'Choose which child this is for.';
  if (!values.startDate) errors.startDate = 'Choose the first day of the absence.';
  if (!values.endDate) errors.endDate = 'Choose the last day of the absence.';
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = 'The last day cannot be before the first day.';
  }
  if (!values.leaveType) errors.leaveType = 'Choose a reason type.';
  if (!values.reason.trim()) errors.reason = 'Tell the school why your child will be away.';
  return errors;
}

/** One labelled field with its error message. */
function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#003366]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

/**
 * The leave-request form.
 *
 * @returns The page.
 */
export default function LeaveForm() {
  const navigate = useNavigate();
  const { selectedStudent } = useSelectedStudent();
  const { wards } = useParentOnboarding();
  const term = useTerm();

  const [childId, setChildId] = useState<string>(() => childRecordId(selectedStudent) ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType | ''>('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<unknown>(null);

  // The child is chosen here, never taken from position 0 of a cached list.
  const children: ParentChild[] = useMemo(() => {
    const list = wards.length > 0 ? wards : selectedStudent ? [selectedStudent] : [];
    return list.filter((child) => childRecordId(child));
  }, [wards, selectedStudent]);

  const effectiveChildId = childId || childRecordId(children[0]) || '';
  const create = useCreateLeaveRequest(effectiveChildId);
  const busy = create.isPending || uploadPercent !== null;

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitError(null);

    const values = { child: effectiveChildId, startDate, endDate, leaveType, reason };
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!term.data?._id) {
      setSubmitError(new Error('The school has not set a current term, so leave cannot be requested yet.'));
      return;
    }
    if (busy) return;

    try {
      // The document has to become a URL before it can go on the request: the
      // form previously sent `[file.name]`, so nothing was ever uploaded and
      // the school received a bare filename it could not open.
      let attachments: string[] | undefined;
      if (file) {
        setUploadPercent(0);
        const stored = await uploadFile(file, (fraction) => setUploadPercent(Math.round(fraction * 100)));
        attachments = [stored.url];
        setUploadPercent(null);
      }

      await create.mutateAsync({
        child: effectiveChildId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        leaveType: leaveType as LeaveType,
        term: term.data._id,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(attachments ? { attachments } : {}),
      });

      toast.success('Leave request submitted. The school will review it.');
      navigate('/requestleave', { replace: true });
    } catch (error) {
      setUploadPercent(null);
      logger.error('leave', 'Could not submit the leave request', error);
      if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        setErrors(error.fieldErrors() as FieldErrors);
      }
      setSubmitError(error);
    }
  };

  if (term.isPending) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <LoadingState count={4} className="h-16" label="Loading the current term" />
      </div>
    );
  }

  if (term.isError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState
          error={term.error}
          onRetry={() => void term.refetch()}
          title="Couldn't load the current term"
          fallback="Leave requests need the school's current term, which we couldn't load."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 md:py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-[#003366] transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#003366]/30 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back
        </button>

        <h1 className="text-xl font-semibold text-gray-900 md:text-[25px] dark:text-slate-100">
          Request student absence
        </h1>
        <p className="mb-6 text-sm text-gray-500 md:text-base dark:text-slate-400">
          Submit a leave request for your child&apos;s upcoming absence.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          {children.length > 1 && (
            <div className="mb-4 md:mb-6">
              <Field label="Which child?" htmlFor="leave-child" error={errors.child}>
                <div className="relative">
                  <select
                    id="leave-child"
                    value={effectiveChildId}
                    onChange={(event) => setChildId(event.target.value)}
                    className={`${inputClass} appearance-none`}
                  >
                    {children.map((child) => (
                      <option key={childRecordId(child)} value={childRecordId(child)}>
                        {childFullName(child)}
                        {child.className ? ` — ${child.className}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                </div>
              </Field>
            </div>
          )}

          {children.length === 1 && (
            <p className="mb-4 rounded-lg bg-[#003366]/5 px-4 py-3 text-sm text-gray-600 md:mb-6 dark:bg-blue-950/30 dark:text-slate-300">
              Requesting leave for{' '}
              <span className="font-semibold text-[#003366] dark:text-blue-300">
                {childFullName(children[0])}
              </span>
              .
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <Field label="Start date" htmlFor="leave-start" error={errors.startDate}>
              <input
                id="leave-start"
                type="date"
                min={today()}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={errors.startDate ? 'leave-start-error' : undefined}
                className={inputClass}
              />
            </Field>
            <Field label="End date" htmlFor="leave-end" error={errors.endDate}>
              <input
                id="leave-end"
                type="date"
                min={startDate || today()}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={errors.endDate ? 'leave-end-error' : undefined}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4 md:mt-6">
            <Field label="Leave type" htmlFor="leave-type" error={errors.leaveType}>
              <div className="relative">
                <select
                  id="leave-type"
                  value={leaveType}
                  onChange={(event) => setLeaveType(event.target.value as LeaveType)}
                  aria-invalid={Boolean(errors.leaveType)}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="" disabled>
                    Select leave type
                  </option>
                  {/* Every value the API's LeaveType enum accepts — the form
                      used to offer three of the six. */}
                  {LEAVE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              </div>
            </Field>
          </div>

          <div className="mt-4 md:mt-6">
            <Field label="Reason for absence" htmlFor="leave-reason" error={errors.reason}>
              <textarea
                id="leave-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Please provide details about the absence"
                aria-invalid={Boolean(errors.reason)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4 md:mt-6">
            <p className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Supporting document (optional)
            </p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 px-3 py-3 dark:border-slate-700">
              <input
                type="file"
                id="leave-file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="leave-file"
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#003366] hover:underline dark:text-blue-300"
              >
                <Paperclip size={14} aria-hidden="true" /> Choose file
              </label>
              {file ? (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs text-gray-600 sm:text-sm dark:text-slate-400">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label={`Remove ${file.name}`}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <span className="text-xs text-gray-500 sm:text-sm dark:text-slate-500">No file chosen</span>
              )}
            </div>
            {uploadPercent !== null && (
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400" role="status">
                Uploading… {uploadPercent}%
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500 sm:text-sm dark:text-slate-500">
              A medical certificate or appointment letter, if you have one.
            </p>
          </div>

          {submitError != null && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            >
              {messageForError(submitError, 'Your request could not be submitted. Please try again.')}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#003366] px-6 py-2.5 font-medium text-white transition hover:bg-[#002244] disabled:opacity-60 md:w-auto dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {busy ? 'Submitting…' : 'Submit leave request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
