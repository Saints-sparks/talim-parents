/**
 * A stable avatar tone (`tl-tone-N`) for an id, so a child or a person has the
 * same colour on every screen.
 *
 * @param id - A stable id.
 * @returns The tone class.
 */
export function toneOf(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `tl-tone-${hash % 6}`;
}
