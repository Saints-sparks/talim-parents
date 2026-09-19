import type { ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import { useActiveChild, type ActiveChild } from '../../hooks/useActiveChild';
import { EmptyState, ErrorState, LoadingState } from '../StateComponents';
import type { ParentChild } from '../../types/parent';

/** Props for {@link ActiveChildGate}. */
interface ActiveChildGateProps {
  /** What the page shows, for the empty and loading copy ("attendance records"). */
  subject: string;
  /** Rendered once there is a verified child; receives it and the full children state. */
  children: (child: ParentChild, active: ActiveChild) => ReactNode;
}

/**
 * Holds a child-scoped page back until the parent's linked children have loaded
 * and one of them is chosen, so the page body never has to handle "no child".
 * Shows a skeleton while loading, a retryable error when the list could not be
 * fetched, and an empty state when the parent has no linked child.
 *
 * @param props - Component props.
 * @param props.subject - What the page shows, for the copy.
 * @param props.children - Render function for the page body.
 * @returns The state, or the page body.
 */
export default function ActiveChildGate({ subject, children }: ActiveChildGateProps) {
  const active = useActiveChild();

  if (active.status === 'loading') {
    return (
      <div className="mx-auto max-w-[1500px]">
        <LoadingState count={3} className="h-28" label={`Loading ${subject}`} />
      </div>
    );
  }

  if (active.status === 'error') {
    return (
      <div className="mx-auto max-w-[1500px]">
        <ErrorState
          error={null}
          onRetry={active.retry}
          title="Couldn't load your children"
          fallback={active.error ?? "We couldn't load the children linked to your account."}
        />
      </div>
    );
  }

  if (active.status === 'empty' || !active.child) {
    return (
      <div className="mx-auto max-w-md py-10">
        <EmptyState
          icon={<CalendarDays className="h-12 w-12 text-[#003366] dark:text-blue-400" aria-hidden="true" />}
          title="No linked child"
          message={`Once a child is linked to your account, their ${subject} will appear here. Contact your school if you expected to see one.`}
        />
      </div>
    );
  }

  return <>{children(active.child, active)}</>;
}
