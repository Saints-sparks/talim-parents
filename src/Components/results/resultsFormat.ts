import type { ResultSummary, SubjectResult } from '../../services/results.services';

/**
 * A class position as an ordinal: 1 -> "1st", 12 -> "12th", 23 -> "23rd".
 *
 * @param n - The position, or nothing.
 * @returns The ordinal, or an em dash when there is no position.
 */
export function ordinal(n: number | null | undefined): string {
  if (!n) return '—';
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

/**
 * A number to a fixed number of decimals, with a unit, or an em dash.
 *
 * @param value - The figure, or nothing.
 * @param digits - Decimal places.
 * @param unit - Appended when there is a value.
 * @returns The formatted figure.
 */
export function formatFigure(value: number | null | undefined, digits = 2, unit = ''): string {
  return value == null ? '—' : `${value.toFixed(digits)}${unit}`;
}

/** The summed raw and maximum score across every subject. */
export interface ScoreTotals {
  totalRaw: number;
  totalMax: number;
}

/**
 * Adds up the score obtained and the score available across subjects.
 *
 * @param subjects - The child's per-subject results.
 * @returns The two totals; `totalMax` is 0 when nothing has been scored.
 */
export function sumScores(subjects: readonly SubjectResult[] | undefined): ScoreTotals {
  const list = subjects ?? [];
  return {
    totalRaw: list.reduce((acc, subject) => acc + (subject.cumulativeScore || 0), 0),
    totalMax: list.reduce((acc, subject) => acc + (subject.maxScore || 0), 0),
  };
}

/**
 * Formats a class-position KPI: "3rd / 28" and the "Top 10.7%" caption.
 *
 * @param summary - The child's result summary.
 * @returns The value and its caption.
 */
export function describePosition(summary: ResultSummary | undefined): { value: string; sub: string | null } {
  if (summary?.classPosition == null) return { value: '—', sub: null };
  const { classPosition, totalStudents } = summary;
  return {
    value: `${ordinal(classPosition)} / ${totalStudents ?? '?'}`,
    sub: totalStudents ? `Top ${((classPosition / totalStudents) * 100).toFixed(1)}%` : null,
  };
}

/**
 * Quotes a CSV cell, and defuses spreadsheet formulas: a subject or remark the
 * school typed as `=HYPERLINK(...)` would otherwise run when a parent opens the
 * download in Excel.
 *
 * @param value - The cell.
 * @returns The quoted cell.
 */
function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * The per-subject results as CSV text.
 *
 * @param subjects - The child's per-subject results.
 * @returns The CSV, header row first.
 */
export function buildResultsCsv(subjects: readonly SubjectResult[]): string {
  const header = ['Subject', 'Test Score (30%)', 'Exam Score (70%)', 'Total Score (%)', 'Grade', 'Remark'];
  const rows = subjects.map((subject) => [
    subject.subjectName,
    subject.testScoreRaw ?? '—',
    subject.examScoreRaw ?? '—',
    formatFigure(subject.totalScore),
    subject.grade,
    subject.remark,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

/**
 * Saves the per-subject results as a CSV file.
 *
 * @param subjects - The child's per-subject results.
 * @param studentName - For the file name.
 */
export function downloadResultsCsv(subjects: readonly SubjectResult[], studentName: string | undefined): void {
  if (!subjects.length) return;
  const blob = new Blob([buildResultsCsv(subjects)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `results-${studentName || 'student'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
