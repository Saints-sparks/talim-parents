import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../services/auth.services';
import { logger } from '../lib/logger';

/** Which child the parent is looking at, and how to change it. */
export interface SelectedStudentContextValue {
  /** The remembered child's Student record id, or `null` before one is chosen. */
  selectedChildId: string | null;
  /** Makes `childId` the child every child-scoped screen shows, and remembers it. */
  selectChild: (childId: string) => void;
}

const SelectedStudentContext = createContext<SelectedStudentContextValue>({
  selectedChildId: null,
  selectChild: () => {},
});

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

/**
 * Remembers which child the parent is looking at, across reloads. Only the
 * id is stored: the child itself always comes from the server's list (B13),
 * so a stale selection can never send another family's id to the API.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function SelectedStudentProvider({ children }: { children: ReactNode }) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const { parentId } = useAuth();

  useEffect(() => {
    if (!parentId) {
      setSelectedChildId(null);
      return;
    }
    try {
      setSelectedChildId(parseStoredChildId(window.localStorage.getItem(selectedChildStorageKey(parentId))));
    } catch (error) {
      logger.warn('selected-student', 'Stored child could not be read', error);
      setSelectedChildId(null);
    }
  }, [parentId]);

  const selectChild = useCallback(
    (childId: string) => {
      if (!parentId || !childId) return;
      try {
        window.localStorage.setItem(selectedChildStorageKey(parentId), childId);
      } catch (error) {
        logger.warn('selected-student', 'Selected child could not be saved', error);
      }
      setSelectedChildId(childId);
    },
    [parentId],
  );

  const value = useMemo(() => ({ selectedChildId, selectChild }), [selectedChildId, selectChild]);

  return <SelectedStudentContext.Provider value={value}>{children}</SelectedStudentContext.Provider>;
}

/**
 * The remembered child id and the setter. Screens read the resolved child
 * through `useActiveChild`, which checks the id against the server's list.
 *
 * @returns The selection and the setter.
 */
export function useSelectedStudent(): SelectedStudentContextValue {
  return useContext(SelectedStudentContext);
}
