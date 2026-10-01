/** The design's twelve subject colours (`.tl-subj-*` in `index.css`). */
export const SUBJECT_KEYS = ['mth', 'eng', 'chm', 'bio', 'phy', 'geo', 'civ', 'bus', 'agr', 'cmp', 'yor', 'art'] as const;

const KNOWN: ReadonlySet<string> = new Set(SUBJECT_KEYS);

/**
 * The tone class of a subject: its own colour key when the API sends one the
 * design knows, otherwise a stable pick from the twelve by the course id, so a
 * subject keeps one colour on every screen.
 *
 * @param colourKey - The API's `colourKey`, if any.
 * @param fallbackId - The course id, for a stable fallback.
 * @returns e.g. `tl-subj-mth`.
 */
export function subjectTone(colourKey: string | null | undefined, fallbackId: string): string {
  if (colourKey && KNOWN.has(colourKey)) return `tl-subj-${colourKey}`;
  let hash = 0;
  for (const ch of colourKey || fallbackId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `tl-subj-${SUBJECT_KEYS[hash % SUBJECT_KEYS.length]}`;
}
