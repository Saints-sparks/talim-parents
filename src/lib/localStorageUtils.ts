import { logger } from './logger';

/**
 * Reads the school id off the stored `user` entry.
 *
 * @returns The school id, or `null` when nobody is stored or the entry is unreadable.
 */
export const getSchoolIdFromLocalStorage = (): string | null => {
  try {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    const userObj = JSON.parse(storedUser) as { user?: { schoolId?: string } } | null;
    return userObj?.user?.schoolId || null;
  } catch (error) {
    logger.warn('storage', 'Could not read the stored user', error);
    return null;
  }
};
