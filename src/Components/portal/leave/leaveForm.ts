import type { LeaveType } from '../../../types/portal/leave';

/** The leave form's types, fields and checks (B9), apart from the screen so they are tested alone. */

/** The leave types (B9), in the design's order and wording. */
export const LEAVE_TYPES: readonly { value: LeaveType; label: string }[] = [
  { value: 'illness', label: 'Illness' },
  { value: 'medical', label: 'Medical appointment' },
  { value: 'family_travel', label: 'Family travel' },
  { value: 'religious', label: 'Religious observance' },
  { value: 'other', label: 'Other' },
];

/** The form's fields. */
export interface LeaveForm {
  type: LeaveType;
  startDate: string;
  endDate: string;
  note: string;
}

/** An empty form. */
export const EMPTY: LeaveForm = { type: 'illness', startDate: '', endDate: '', note: '' };

/**
 * Checks the form before it is sent.
 *
 * @param form - The fields.
 * @returns A message per invalid field.
 */
export function validateLeave(form: LeaveForm): Partial<Record<keyof LeaveForm, string>> {
  const errors: Partial<Record<keyof LeaveForm, string>> = {};
  if (!form.startDate) errors.startDate = 'Choose the first day of leave.';
  if (form.endDate && form.startDate && form.endDate < form.startDate) errors.endDate = 'The last day must be on or after the first.';
  if (form.note.length > 500) errors.note = 'Keep the note under 500 characters.';
  return errors;
}
