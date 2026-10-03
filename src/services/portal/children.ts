import { api } from '../../lib/apiClient';
import type { ChildSummary, LinkChildPayload, LinkChildResult } from '../../types/portal/children';

/**
 * B13 and A11: the parent's linked children, across schools. These routes are
 * about the parent, not one child, so they send no `childId`.
 */

/**
 * Every child linked to the signed-in parent, in one batched call (B13).
 *
 * @returns The children, the school's default first as the API orders them.
 * @throws {ApiError} On any non-2xx.
 */
export async function getChildren(): Promise<ChildSummary[]> {
  const body = await api.get<ChildSummary[] | { children?: ChildSummary[] }>('/parents/me/children');
  return Array.isArray(body) ? body : (body?.children ?? []);
}

/**
 * Links another child with the code the school office issued (A11). Works for
 * a child at another school too.
 *
 * @param payload - The code (`ABCD-1234`) and how the parent is related.
 * @returns The newly linked child.
 * @throws {ApiError} `NOT_FOUND` for a wrong or expired code, `CONFLICT` for a used one.
 */
export function linkChild(payload: LinkChildPayload): Promise<LinkChildResult> {
  return api.post<LinkChildResult>('/parents/me/children/link', {
    code: payload.code.trim().toUpperCase(),
    relationship: payload.relationship,
  });
}

