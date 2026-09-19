import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState, LoadingState } from '../StateComponents';

/**
 * Renders one result view from its own query: a skeleton while it loads, a
 * retryable error if it failed, otherwise the view. One failing view leaves
 * the other tabs readable.
 *
 * @param props - Component props.
 * @param props.query - The query behind this tab.
 * @param props.title - Names the view in the error heading.
 * @param props.children - Renders the view from the loaded data.
 * @returns The tab body.
 */
export default function ResultsTabPanel<T>({
  query,
  title,
  children,
}: {
  query: UseQueryResult<T>;
  title: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <LoadingState count={3} className="h-16" label={`Loading ${title}`} />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} title={`Couldn't load ${title}`} />;
  }
  return <>{children(query.data)}</>;
}
