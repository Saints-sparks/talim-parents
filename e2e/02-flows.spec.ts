import type { Page } from '@playwright/test';
import { test, expect, type Allowed } from './support/fixtures';
import { ACCOUNTS, authFile } from './support/creds';
import { apiCall, apiLogin, unwrap } from './support/api';
import { dismissGuide } from './support/ui';

/**
 * The parent's write flows for Ada (the default child):
 * - Results: "Sign as parent" on the published Third Term report;
 * - Leave: send a request, then withdraw it;
 * - Payments: the part-payment minimum is enforced, and a bank transfer is
 *   recorded as Pending (no provider checkout). The test transfer is then
 *   rejected through the API so the fee is free for the next run;
 * - My tickets: raise a ticket to the school, see the reply as new, reply.
 */
const RUN = Date.now().toString(36).slice(-5);
const ALLOW: readonly Allowed[] = [];

test.use({ storageState: authFile('parent') });

/** Opens a page and waits for skeletons to go. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('.animate-pulse:visible')).toHaveCount(0, { timeout: 30_000 });
  await dismissGuide(page, 2_000);
}

test('Results: sign as parent', async ({ page, monitor }) => {
  monitor.clear();
  await open(page, '/results');
  const sign = page.getByRole('button', { name: 'Sign as parent' });
  const download = page.getByRole('button', { name: 'Download term report' });
  await expect(sign.or(download)).toBeVisible();
  if (await sign.isVisible()) {
    const acked = page.waitForResponse((r) => /acknowledge/.test(r.url()) && r.request().method() === 'POST');
    await sign.click();
    expect((await acked).ok()).toBe(true);
    await expect(page.getByRole('status').filter({ hasText: /^Signed\./ })).toBeVisible();
  }
  // Signed (now, or by an earlier run): the download is offered and the sheet shows the date.
  await expect(download).toBeVisible();
  await expect(page.getByText(/^Acknowledged /)).toBeVisible();
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test('Leave: send a request, then withdraw it', async ({ page, monitor }) => {
  monitor.clear();
  await open(page, '/leave');
  const note = `E2E ${RUN}: dentist in the morning`;
  const form = page.getByRole('form', { name: 'New leave request' });
  await form.getByLabel('Reason for leave').selectOption('medical');
  const day = new Date(Date.now() + 14 * 86_400_000);
  while ([0, 6].includes(day.getDay())) day.setDate(day.getDate() + 1);
  const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  await form.getByLabel('From').fill(ymd);
  await form.getByLabel('To').fill(ymd);
  await form.getByLabel(/Note to the teacher/).fill(note);
  const sent = page.waitForResponse((r) => /\/leave$/.test(r.url()) && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'Send request' }).click();
  expect((await sent).status()).toBe(201);
  const item = page.getByRole('listitem').filter({ hasText: note });
  await expect(item).toContainText('Pending');
  await item.getByRole('button', { name: 'Delete the Medical appointment request' }).click();
  await expect(page.getByText('Request withdrawn. The school will no longer see it.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: note })).toHaveCount(0);
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test('Payments: the part-payment minimum holds, and a bank transfer goes Pending', async ({ page, monitor }) => {
  monitor.clear();
  await open(page, '/payments');
  await page.getByRole('button', { name: 'Pay now: Uniform and Games Kit' }).click();
  const sheet = page.getByRole('dialog', { name: 'Uniform and Games Kit' });

  // Part payment below the school's ₦10,000 minimum is refused before anything is sent.
  await sheet.getByRole('button', { name: /Part payment/ }).click();
  await sheet.getByLabel('Amount to pay now, in naira').fill('5000');
  await expect(sheet.getByText(/minimum ₦10,000/)).toBeVisible();
  await sheet.getByRole('radio', { name: /Bank transfer/ }).click();
  await sheet.getByRole('button', { name: /^Pay ₦/ }).click();
  await expect(sheet.locator('[aria-invalid="true"]')).toHaveCount(1);
  await expect(sheet.getByRole('form', { name: 'Record a bank transfer' })).toHaveCount(0);

  // At the minimum it goes through to the transfer form.
  await sheet.getByLabel('Amount to pay now, in naira').fill('10000');
  await expect(sheet.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(sheet.getByText('₦12,000 will stay outstanding after this payment.')).toBeVisible();
  await sheet.getByRole('button', { name: 'Pay ₦10,000 by bank transfer' }).click();
  const transferForm = sheet.getByRole('form', { name: 'Record a bank transfer' });
  await expect(transferForm).toContainText('1012345678');
  await transferForm.getByLabel(/Transfer reference/).fill(`E2E${RUN}`.toUpperCase());
  const today = new Date();
  await transferForm.getByLabel(/Date you paid/).fill(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  const recorded = page.waitForResponse((r) => /\/payments\/parent\/bank-transfer$/.test(r.url()) && r.request().method() === 'POST');
  await transferForm.getByRole('button', { name: 'I have made the transfer' }).click();
  const res = await recorded;
  expect(res.ok()).toBe(true);
  expect(res.request().postDataJSON()).toMatchObject({ amount: 10000 });
  const body = unwrap<{ transfer: { id: string } }>(await res.json());
  await expect(sheet.getByRole('heading', { name: 'Transfer recorded · Pending' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Payment pending').first()).toBeVisible();

  // Free the fee for the next run: the bursary rejects the test transfer.
  const admin = await apiLogin(ACCOUNTS.schoolAdmin);
  await apiCall(admin, 'POST', `/payments/admin/bank-transfers/${body.transfer.id}/reject`, { reason: 'E2E test transfer' });
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});

test('My tickets: raise a ticket to the school, see the reply, reply', async ({ page, monitor }) => {
  monitor.clear();
  const subject = `E2E ${RUN}: bus pick-up time`;
  const loaded = page.waitForResponse((r) => /\/tickets\/mine(\?|$)/.test(r.url()) && r.ok());
  await page.goto('/settings?tab=help');
  await loaded;
  await dismissGuide(page, 2_000);
  await page.getByRole('button', { name: 'New ticket' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'How can we help?' });
  await sheet.getByLabel('Which child is it about?').selectOption({ label: 'Ada Student' }).catch(async () => {
    const options = await sheet.getByLabel('Which child is it about?').locator('option').allTextContents();
    await sheet.getByLabel('Which child is it about?').selectOption({ label: options.find((o) => o.startsWith('Ada'))! });
  });
  await sheet.getByRole('radio', { name: /^My school/ }).click();
  await sheet.getByRole('radio', { name: 'Transport' }).click();
  await sheet.getByLabel('Subject').fill(subject);
  await sheet.getByLabel('Message').fill('What time does the school bus pick up on Fridays?');
  const created = page.waitForResponse((r) => /\/tickets$/.test(r.url()) && r.request().method() === 'POST');
  await sheet.getByRole('button', { name: 'Send ticket' }).click();
  const res = await created;
  expect(res.status()).toBe(201);
  const ticket = unwrap<{ id: string; reference: string }>(await res.json());
  expect(res.request().postDataJSON()).toMatchObject({ desk: 'school', area: 'transport', subject });

  const admin = await apiLogin(ACCOUNTS.schoolAdmin);
  const staffReply = `E2E ${RUN}: 7:15 at the main gate.`;
  await apiCall(admin, 'POST', `/tickets/${ticket.id}/messages`, { body: staffReply });

  const loaded2 = page.waitForResponse((r) => /\/tickets\/mine(\?|$)/.test(r.url()) && r.ok());
  await page.goto('/settings?tab=help');
  await loaded2;
  await dismissGuide(page, 2_000);
  const row = page.getByRole('list', { name: 'My tickets' }).getByRole('listitem').filter({ hasText: subject });
  await expect(row).toContainText('1 new');
  await row.getByRole('button').first().click();
  const thread = page.getByRole('dialog', { name: subject });
  await expect(thread.getByRole('list', { name: 'Messages' })).toContainText(staffReply);
  const mine = `E2E ${RUN}: thank you.`;
  await thread.getByLabel('Your reply').fill(mine);
  const posted = page.waitForResponse((r) => r.url().endsWith(`/tickets/${ticket.id}/messages`) && r.request().method() === 'POST');
  await thread.getByRole('button', { name: 'Send reply' }).click();
  expect((await posted).status()).toBe(201);
  await expect(thread.getByRole('list', { name: 'Messages' })).toContainText(mine);
  expect(monitor.unexpected(ALLOW)).toEqual([]);
});
