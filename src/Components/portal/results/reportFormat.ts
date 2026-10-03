import { ordinal } from '../../../lib/format';
import type { Tone } from '../ui/styles';
import type { GradeBand, Position } from '../../../types/portal/common';
import type { ReportCard, ReportTerm } from '../../../types/portal/reportCard';

/** Report card wording and states (B5), apart from the screen so they are tested alone. */

/** Where a term's report stands, as the design names it. */
export type ReportPhase = 'pending' | 'live' | 'published' | 'archived';

/**
 * The state of a term's report: not published yet, live (scores still being
 * published), published this term, or archived (a past term).
 *
 * @param term - The term from the picker.
 * @param report - The report, once loaded.
 * @returns The phase.
 */
export function reportPhase(term: ReportTerm | undefined, report?: ReportCard): ReportPhase {
  const status = report?.status ?? term?.status;
  if (!status || status === 'none') return 'pending';
  if (status === 'partial') return 'live';
  const current = report?.term.isCurrent ?? term?.isCurrent;
  return current ? 'published' : 'archived';
}

/**
 * The tone of a grade, by its place on the school's scale: the top band
 * green, the next blue, the middle amber, the bottom (fail) red.
 *
 * @param grade - The letter.
 * @param scale - The school's scale, best first.
 * @returns The pill tone.
 */
export function gradeTone(grade: string | null | undefined, scale: readonly GradeBand[]): Tone {
  const index = scale.findIndex((band) => band.grade === grade);
  if (index < 0) return 'muted';
  if (index === 0) return 'success';
  if (index === 1) return 'info';
  if (index === scale.length - 1) return 'danger';
  return 'warning';
}

/**
 * "5th of 28".
 *
 * @param position - The rank, or null.
 * @returns The text, or an em dash.
 */
export function positionText(position: Position | null | undefined): string {
  return position ? `${ordinal(position.rank)} of ${position.of}` : '—';
}

/**
 * Each band's range, from its minimum to just under the band above.
 *
 * @param scale - The school's scale, best first.
 * @returns e.g. `[{ grade: 'A', range: '75 – 100%', label: 'Excellent' }]`.
 */
export function scaleRanges(scale: readonly GradeBand[]): { grade: string; range: string; label: string }[] {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.map((band, index) => ({
    grade: band.grade,
    range: `${band.min} – ${index === 0 ? 100 : sorted[index - 1].min - 1}%`,
    label: band.label ?? '',
  }));
}
