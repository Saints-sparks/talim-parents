import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../../../test-utils/portal';
import { TourProvider } from '../TourProvider';

vi.setConfig({ testTimeout: 20_000 });

/**
 * A page inside the tour provider, as the app mounts it.
 *
 * @returns The tree.
 */
const Page = () => (
  <TourProvider>
    <p>Dashboard</p>
  </TourProvider>
);

describe('TourProvider (fixtures)', () => {
  it('opens once for an account that never finished it, and stamps it on the account', async () => {
    const { fixtures } = renderPortal(<Page />, { path: '/dashboard', prepare: (db) => (db.tourCompletedAt = null) });
    expect(await screen.findByText(/Step 1 of/)).toBeInTheDocument();
    await waitFor(() => expect(requestsTo(fixtures, '/parent/settings/preferences')).toHaveLength(1));
    expect(requestsTo(fixtures, '/parent/settings/preferences')[0].body).toEqual({ guides: { tourCompleted: true } });
    expect(fixtures.db.tourCompletedAt).not.toBeNull();
  });

  it('stays closed when the account has finished it (GET /parent/settings guides)', async () => {
    const { fixtures } = renderPortal(<Page />, { path: '/dashboard' });
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    await waitFor(() => expect(requestsTo(fixtures, '/parent/settings')).not.toHaveLength(0));
    expect(screen.queryByText(/Step 1 of/)).not.toBeInTheDocument();
    expect(requestsTo(fixtures, '/parent/settings/preferences')).toHaveLength(0);
  });
});
