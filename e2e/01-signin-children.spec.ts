import { test, expect, type Allowed } from './support/fixtures';
import { ACCOUNTS, CHILDREN, authFile } from './support/creds';
import { signInThroughUi, switchChild } from './support/auth';
import { PARENT_SCREENS } from './support/pages';
import { dismissGuide, gotoSettled } from './support/ui';

/**
 * Sign-in (a student is refused), switching between the three children across
 * the two schools, and every screen loading for each child with no uncaught
 * error, console.error or failed API call.
 */
const REFUSED: readonly Allowed[] = [
  { kind: 'external', match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: 'Google Fonts are blocked by the harness; the system font is used.' },
  { kind: 'http', match: /POST \/auth\/login -> 40[13]/, reason: 'The refused sign-in is the point of the test.' },
  { kind: 'http', match: /POST \/auth\/refresh -> 401/, reason: 'A signed-out visit tries the refresh cookie once; there is none.' },
  { kind: 'console.error', match: /40[13]|Access denied|registered as/i, reason: 'The client logs the refused sign-in.' },
];
const ALLOW: readonly Allowed[] = [
  { kind: 'external', match: /fonts\.googleapis\.com|fonts\.gstatic\.com/, reason: 'Google Fonts are blocked by the harness; the system font is used.' },
];

test('the parent signs in (onboarding on a first visit)', async ({ page, monitor }) => {
  monitor.clear();
  await signInThroughUi(page, ACCOUNTS.parent);
  // A first sign-in on this browser opens onboarding (confirm the profile, choose a child).
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { level: 1, name: /^(Good \w+, Paul|Let.s confirm your profile)$/ })).toBeVisible();
  expect(monitor.unexpected(REFUSED.filter((a) => !/login/.test(a.match.source)))).toEqual([]);
});

test('a student is refused', async ({ page, monitor }) => {
  monitor.clear();
  await signInThroughUi(page, ACCOUNTS.student);
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page).not.toHaveURL(/\/dashboard/);
  expect(monitor.unexpected(REFUSED)).toEqual([]);
});

test.describe('signed in', () => {
  test.use({ storageState: authFile('parent') });

  test('the switcher lists all three children by school and switches between them', async ({ page, monitor }) => {
    monitor.clear();
    await page.goto('/dashboard');
    await dismissGuide(page, 3_000);
    await page.getByRole('button', { name: /^Viewing .+\. Switch child$/ }).first().click();
    const greenfield = page.getByRole('group', { name: /Greenfield Academy/ });
    const hillview = page.getByRole('group', { name: /Hillview Academy/ });
    await expect(greenfield.getByRole('button', { name: /^Ada Student/ })).toBeVisible();
    await expect(greenfield.getByRole('button', { name: /^Ben Student/ })).toBeVisible();
    await expect(hillview.getByRole('button', { name: /^Cara Student/ })).toBeVisible();
    await page.keyboard.press('Escape');
    for (const child of [...CHILDREN].reverse()) {
      await switchChild(page, child.name);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(new RegExp(`Here is how ${child.name.split(' ')[0]} is doing`))).toBeVisible();
    }
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    expect(monitor.unexpected(ALLOW)).toEqual([]);
  });

  for (const child of CHILDREN) {
    test(`every screen loads for ${child.name}`, async ({ page, monitor }) => {
      test.setTimeout(420_000);
      await gotoSettled(page, '/dashboard');
      await dismissGuide(page, 3_000);
      await switchChild(page, child.name);
      for (const screen of PARENT_SCREENS) {
        monitor.clear();
        await gotoSettled(page, screen.path);
        await expect(page.locator('.animate-pulse:visible')).toHaveCount(0, { timeout: 30_000 });
        await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible();
        if (child.name === 'Ada Student') await expect(page.getByText(screen.content).filter({ visible: true }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: `Viewing ${child.name}. Switch child` }).first()).toBeVisible();
        await dismissGuide(page, 1_500);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
        expect(monitor.unexpected(ALLOW), `unexpected findings on ${screen.path} for ${child.name}`).toEqual([]);
      }
    });
  }
});
