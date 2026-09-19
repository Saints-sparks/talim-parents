import { useEffect, useMemo } from 'react';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { childRecordId, type ParentChild } from '../types/parent';

/** What a child-scoped page can be in before it has a child to ask about. */
export type ActiveChildStatus = 'loading' | 'error' | 'empty' | 'ready';

/** The result of {@link useActiveChild}. */
export interface ActiveChild {
  status: ActiveChildStatus;
  /** The child every child-scoped request should use; only set when `ready`. */
  child: ParentChild | null;
  /** The child's Student record id — what every child-scoped route expects. */
  childId: string | undefined;
  /** Every child linked to the signed-in parent. */
  wards: ParentChild[];
  /** Why the children could not be loaded, when `status` is `error`. */
  error: string | null;
  /** Fetches the linked children again. */
  retry: () => void;
  /** Switches the child the whole app is showing. */
  select: (child: ParentChild) => void;
}

/**
 * Picks the child to show from the list the server says is linked to this
 * parent.
 *
 * The remembered selection lives in `localStorage`, so it can outlive the
 * link (a school unlinks a child) or come from a stale build. Trusting it
 * would send that child's id to the API, which answers FORBIDDEN. Instead the
 * selection is only honoured when it is in the server's list; otherwise the
 * parent's default child, then the first one, is used.
 *
 * @param wards - The children the API returned for this parent.
 * @param selected - The remembered selection, if any.
 * @returns The child to show, or `null` when the parent has none.
 */
export function resolveActiveChild(
  wards: ParentChild[],
  selected: ParentChild | null | undefined,
): ParentChild | null {
  if (wards.length === 0) return null;
  const selectedId = childRecordId(selected);
  const match = selectedId ? wards.find((ward) => childRecordId(ward) === selectedId) : undefined;
  return match ?? wards.find((ward) => ward.isDefault) ?? wards[0];
}

/**
 * The child a child-scoped page (attendance, results, timetable, leave) is
 * about, verified against the parent's linked children.
 *
 * Requests are held until the linked-children list has loaded, so a child id
 * that is not this parent's is never sent — the server would refuse it, and
 * the page would flash an error for what is really a stale selection. When
 * the remembered selection is stale it is replaced, so the header switcher
 * and every page agree.
 *
 * @returns The resolved child, or why there is not one yet.
 */
export function useActiveChild(): ActiveChild {
  const { wards, wardsLoading, wardsError, refreshWards } = useParentOnboarding();
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();

  const child = useMemo(() => resolveActiveChild(wards, selectedStudent), [wards, selectedStudent]);
  const childId = childRecordId(child);

  useEffect(() => {
    if (child && childId !== childRecordId(selectedStudent)) updateSelectedStudent(child);
  }, [child, childId, selectedStudent, updateSelectedStudent]);

  let status: ActiveChildStatus = 'ready';
  if (wardsLoading) status = 'loading';
  else if (wardsError && !child) status = 'error';
  else if (!child) status = 'empty';

  return {
    status,
    child: status === 'ready' ? child : null,
    childId: status === 'ready' ? childId : undefined,
    wards,
    error: wardsError,
    retry: () => {
      void refreshWards();
    },
    select: updateSelectedStudent,
  };
}
