import { expect, type Page } from "@playwright/test";

/**
 * The app opens a first-visit tour over each page (and dims it). Closes it if
 * it shows up within `waitMs`; the tour appears a moment after the page does.
 */
export async function dismissGuide(page: Page, waitMs = 5_000): Promise<void> {
  const close = page.getByRole("button", { name: "Close guide" });
  const shown = await close
    .waitFor({ state: "visible", timeout: waitMs })
    .then(() => true)
    .catch(() => false);
  // Escape closes the guide (useAppGuide); a click can miss when the card sits partly off a phone's screen.
  if (shown) await page.keyboard.press("Escape");
  if (await close.count()) await close.click({ force: true }).catch(() => undefined);
  await expect(close).toHaveCount(0);
}

/**
 * Navigates and waits for the document, retrying when the app's own client-side
 * redirect (session restore, onboarding, child switch) aborts the navigation
 * with `net::ERR_ABORTED` / a detached frame, which happens under load on the
 * dev server.
 *
 * @param page - The Playwright page.
 * @param path - The app path to open.
 * @param attempts - How many navigations to try before giving up.
 * @returns Resolves once a navigation to `path` has loaded its document.
 */
export async function gotoSettled(page: Page, path: string, attempts = 3): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      const aborted = /ERR_ABORTED|frame was detached/i.test(String(error));
      if (!aborted || attempt >= attempts) throw error;
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    }
  }
}
