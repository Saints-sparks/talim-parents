import { test as setup, expect } from '@playwright/test';
import { ACCOUNTS, authFile } from './support/creds';
import { signInThroughUi } from './support/auth';

/** Signs Paul Parent in once and stores the session for the other specs. */
setup('sign in parent', async ({ page }) => {
  await signInThroughUi(page, ACCOUNTS.parent);
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 60_000 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
  await page.context().storageState({ path: authFile('parent') });
});
