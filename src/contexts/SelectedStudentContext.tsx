import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../services/auth.services';
import { logger } from '../lib/logger';
import type { ParentChild } from '../types/parent';

/** Which child the parent is currently looking at, and how to change it. */
export interface SelectedStudentContextValue {
  selectedStudent: ParentChild | null;
  updateSelectedStudent: (student: ParentChild) => void;
}

const SelectedStudentContext = createContext<SelectedStudentContextValue>({
  selectedStudent: null,
  updateSelectedStudent: () => {},
});

/**
 * The storage key for one parent's chosen child. Scoped by parent id so two
 * accounts on one browser never see each other's selection.
 *
 * @param parentId - The signed-in parent's user id.
 * @returns The localStorage key.
 */
const storageKey = (parentId: string): string => `selected_student_${parentId}`;

/**
 * Remembers which child the parent is looking at, across reloads.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function SelectedStudentProvider({ children }: { children: ReactNode }) {
  const [selectedStudent, setSelectedStudent] = useState<ParentChild | null>(null);
  const { parentId } = useAuth();

  useEffect(() => {
    if (!parentId) {
      setSelectedStudent(null);
      return;
    }
    const stored = window.localStorage.getItem(storageKey(parentId));
    if (!stored) {
      setSelectedStudent(null);
      return;
    }
    try {
      setSelectedStudent(JSON.parse(stored) as ParentChild);
    } catch (error) {
      logger.warn('selected-student', 'Stored child could not be parsed', error);
      setSelectedStudent(null);
    }
  }, [parentId]);

  const updateSelectedStudent = useCallback(
    (student: ParentChild) => {
      if (!parentId || !student) return;
      window.localStorage.setItem(storageKey(parentId), JSON.stringify(student));
      setSelectedStudent(student);
    },
    [parentId],
  );

  const value = useMemo(
    () => ({ selectedStudent, updateSelectedStudent }),
    [selectedStudent, updateSelectedStudent],
  );

  return <SelectedStudentContext.Provider value={value}>{children}</SelectedStudentContext.Provider>;
}

/**
 * The child the parent is currently looking at.
 *
 * @returns The selected child and the setter.
 */
export function useSelectedStudent(): SelectedStudentContextValue {
  return useContext(SelectedStudentContext);
}
