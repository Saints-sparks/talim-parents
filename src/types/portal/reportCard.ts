/**
 * B5 report card and B8 parent acknowledgement, as the generated contract
 * describes them.
 */
import type { Schema } from '../apiContract';

/**
 * One subject row: a score per column, `null` in a column not published yet.
 * BACKEND GAP: the OpenAPI DTO types `scores` as `number[] | null`, but the
 * API sends `null` items for unpublished columns (`[17, null, null]`).
 */
export type ReportRow = Omit<Schema<'ReportRowDto'>, 'scores'> & { scores: (number | null)[] | null };

/** `GET /parents/me/children/:childId/report-card?termId=` (B5). */
export type ReportCard = Omit<Schema<'ReportCardDto'>, 'rows'> & { rows: ReportRow[] };

/** Whether a term's results exist yet (B5). */
export type ReportStatus = ReportCard['status'];

/** One assessment column (1st CA / 20, Exam / 60…), from the school's set-up. */
export type ReportColumn = Schema<'ReportColumnDto'>;

/** A course on the report: `{ id, code, title, short, colourKey }`. */
export type ReportCourse = Schema<'LearnerCourseDto'>;

/** The strongest or weakest subject, flat: `{ courseId, title, short, colourKey, percent, position }`. */
export type ReportHighlight = Schema<'ReportHighlightDto'>;

/** One entry of `GET .../report-card/terms` (B5), newest first. */
export type ReportTerm = Schema<'ReportTermDto'>;

/** `POST /parents/me/children/:childId/report-card/acknowledge` (B8). */
export type AcknowledgeResult = Schema<'AcknowledgedDto'>;
