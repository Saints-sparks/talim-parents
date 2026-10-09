import { test as setup, expect } from '@playwright/test';
import { ACCOUNTS, authFile } from './support/creds';
import { apiLogin } from './support/api';
import { signInThroughUi } from './support/auth';

/** The user id in an access token (`sub`). */
function subOf(token: string): string {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).sub as string;
}

/**
 * Signs Paul Parent in once and stores the session for the other specs. A
 * first sign-in on a browser goes through onboarding until the profile is
 * confirmed and a child chosen (ProtectedRoute); that is recorded on this
 * browser as the checklist would record it, so the portal opens on the dashboard.
 */
setup('sign in parent', async ({ page }) => {
  await signInThroughUi(page, ACCOUNTS.parent);
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 60_000 });
  const parentId = subOf(await apiLogin(ACCOUNTS.parent));
  await page.evaluate((id) => {
    const key = `parent_onboarding_${id}`;
    const prior = JSON.parse(localStorage.getItem(key) ?? '{}') as { completedSteps?: string[] };
    const steps = new Set([...(prior.completedSteps ?? []), 'parent-profile', 'select-ward']);
    localStorage.setItem(key, JSON.stringify({ ...prior, completedSteps: [...steps], setupDismissed: true }));
  }, parentId);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: /^Good \w+, Paul$/ })).toBeVisible({ timeout: 60_000 });
  await page.context().storageState({ path: authFile('parent') });
});
