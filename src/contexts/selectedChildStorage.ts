import { logger } from '../lib/logger';

/**
 * The storage key for one parent's chosen child. Scoped by parent id so two
 * accounts on one browser never see each other's selection.
 *
 * @param parentId - The signed-in parent's user id.
 * @returns The localStorage key.
 */
export const selectedChildStorageKey = (parentId: string): string => `selected_student_${parentId}`;

/**
 * Reads the remembered child id. Earlier builds stored the whole child
 * object; its id is taken from that shape too, so an upgrade keeps the choice.
 *
 * @param raw - The stored string.
 * @returns The child id, or `null`.
 */
export function parseStoredChildId(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('{')) return raw;
  try {
    const legacy = JSON.parse(raw) as { id?: string; childId?: string; _id?: string };
    return legacy.id ?? legacy.childId ?? legacy._id ?? null;
  } catch (error) {
    logger.warn('selected-student', 'Stored child could not be parsed', error);
    return null;
  }
}
