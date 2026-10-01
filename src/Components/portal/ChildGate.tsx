import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveChild } from '../../hooks/useActiveChild';
import { firstNameOf } from '../../lib/format';
import { ErrorCard, LoadingCard, NoChildCard, NoClassCard, StateAction } from './ui/primitives';
import type { ChildSummary } from '../../types/portal/children';

/** Props for {@link ChildGate}. */
export interface ChildGateProps {
  /** Renders the screen for the resolved child. */
  children: (child: ChildSummary) => ReactNode;
  /**
   * What the screen shows that needs a class ("lessons", "results"); when set,
   * a child the school has not placed in a class gets the no-class state
   * instead of requests that cannot succeed.
   */
  needsClass?: string;
  /** The skeleton's accessible label. */
  loadingLabel?: string;
}

/**
 * The states every child-scoped screen shares before it can ask the API
 * anything: the children loading, failing, none linked, and (optionally) a
 * child without a class. Only once a linked child is resolved does the screen
 * render, so no request goes out for a child that is not the parent's.
 *
 * @param props - See {@link ChildGateProps}.
 * @returns A state card, or the screen.
 */
export function ChildGate({ children, needsClass, loadingLabel = 'Loading your children' }: ChildGateProps) {
  const active = useActiveChild();
  const navigate = useNavigate();

  if (active.status === 'loading') return <LoadingCard label={loadingLabel} />;
  if (active.status === 'error') return <ErrorCard error={active.error} title="Your children couldn't be loaded" onRetry={active.retry} />;
  if (active.status === 'empty' || !active.child) {
    return <NoChildCard action={<StateAction onClick={() => navigate('/settings?tab=children')}>Enter link code</StateAction>} />;
  }
  if (needsClass && !active.child.class) {
    return (
      <NoClassCard
        childName={firstNameOf(active.child.name)}
        what={needsClass}
        action={<StateAction onClick={() => navigate('/messages?to=office')}>Message the school office</StateAction>}
      />
    );
  }
  return <>{children(active.child)}</>;
}
