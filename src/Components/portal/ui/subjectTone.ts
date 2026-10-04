/** The design's twelve subject colours (`.tl-subj-*` in `index.css`). */
export const SUBJECT_KEYS = ['mth', 'eng', 'chm', 'bio', 'phy', 'geo', 'civ', 'bus', 'agr', 'cmp', 'yor', 'art'] as const;

/**
 * The tone class of a subject. The API's `colourKey` is a small integer per
 * course of the class (0..n-1, stable as courses are added), so it indexes
 * the twelve colours; without one, a stable pick by the course id, so a
 * subject keeps one colour on every screen.
 *
 * @param colourKey - The API's `colourKey`, if any.
 * @param fallbackId - The course id, for a stable fallback.
 * @returns e.g. `tl-subj-mth`.
 */
export function subjectTone(colourKey: number | null | undefined, fallbackId: string): string {
  if (typeof colourKey === 'number' && Number.isInteger(colourKey) && colourKey >= 0) {
    return `tl-subj-${SUBJECT_KEYS[colourKey % SUBJECT_KEYS.length]}`;
  }
  let hash = 0;
  for (const ch of fallbackId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `tl-subj-${SUBJECT_KEYS[hash % SUBJECT_KEYS.length]}`;
}
