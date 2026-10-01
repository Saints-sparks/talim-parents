/**
 * Fixture transports installed by tests, removed after each test by the setup
 * file. Kept apart from `portal.tsx` so the setup file imports nothing of the
 * app (a module the setup imports could not be mocked by a test file).
 */

/** Something that can be uninstalled. */
interface Uninstallable {
  uninstall: () => void;
}

const installed: Uninstallable[] = [];

/**
 * Remembers an installed fixture transport.
 *
 * @param fixtures - The installed fixtures.
 */
export function trackFixtures(fixtures: Uninstallable): void {
  installed.push(fixtures);
}

/** Removes every installed fixture transport. */
export function uninstallAllFixtures(): void {
  while (installed.length) installed.pop()?.uninstall();
}
