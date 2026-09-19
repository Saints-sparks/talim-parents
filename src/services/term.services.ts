import { api } from '../lib/apiClient';

/** An academic term, as `talimBE-V2/src/modules/academic` models it. */
export interface Term {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYearId: string;
  schoolId: string;
  isCurrent: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The school's current term.
 *
 * Scoped to the caller's own school by `requireSchoolId(req)` — the client
 * sends no school id.
 *
 * @returns The current term.
 * @throws {ApiError} `NOT_FOUND` when the school has not set one.
 */
export function getCurrentTerm(): Promise<Term> {
  return api.get<Term>('/academic-year-term/term/current');
}

/**
 * Every term of the parent's school, newest academic year first as the API
 * stores them.
 *
 * Scoped to the caller's own school by `requireSchoolId(req)` — the client
 * sends no school id. The route answers `{ message, terms }`; a bare array is
 * accepted too so a contract tidy-up on the server cannot blank the picker.
 *
 * @returns The terms, possibly empty.
 * @throws {ApiError} On any non-2xx.
 */
export async function getSchoolTerms(): Promise<Term[]> {
  const body = await api.get<Term[] | { terms?: Term[] }>('/academic-year-term/term/school');
  if (Array.isArray(body)) return body;
  return body?.terms ?? [];
}
