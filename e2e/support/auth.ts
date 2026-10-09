import { expect, type Page } from '@playwright/test';
import type { Account } from './creds';

/** Signs in through the real form at / (email and password). */
export async function signInThroughUi(page: Page, account: Pick<Account, 'email' | 'password'>): Promise<void> {
  await page.goto('/');
  await page.locator('#identifier').fill(account.email);
  await page.locator('#password').fill(account.password);
  const keep = page.getByLabel(/Keep me signed in/);
  if (await keep.count()) await keep.check();
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Opens the child switcher and picks `name`; resolves once the portal shows that child. */
export async function switchChild(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: /^Viewing .+\. Switch child$/ }).first().click();
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
  await expect(page.getByRole('button', { name: `Viewing ${name}. Switch child` }).first()).toBeVisible();
}
