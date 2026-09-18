import { api } from '../lib/apiClient';

/** A school, as the parent app reads it. */
export interface School {
  _id: string;
  name: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  schoolLogo?: string;
  [key: string]: unknown;
}

/**
 * One school by id.
 *
 * @param schoolId - The school's id; in this app always the parent's own,
 *   taken from the session rather than chosen in the UI.
 * @returns The school.
 * @throws {ApiError} `NOT_FOUND` when it does not exist.
 */
export function fetchSchoolById(schoolId: string): Promise<School> {
  if (!schoolId) throw new Error('A school id is required.');
  return api.get<School>(`/schools/${encodeURIComponent(schoolId)}`);
}
