import type { AttendanceCalendarDay } from '../../services/attendance.services';

/**
 * Quotes a CSV cell, and defuses spreadsheet formulas: attendance notes are
 * typed by staff, and one starting with `=` would otherwise run when a parent
 * opens the download in Excel.
 *
 * @param value - The cell.
 * @returns The quoted cell.
 */
function csvCell(value: string): string {
  const safe = /^[=+@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * The month's attendance records as CSV text.
 *
 * @param records - The rows to export.
 * @returns The CSV, header row first.
 */
export function buildAttendanceCsv(records: AttendanceCalendarDay[]): string {
  const rows = [
    ['Date', 'Day', 'Status', 'Time', 'Notes'],
    ...records.map((record) => [
      record.date,
      String(record.day),
      record.statusLabel,
      record.time || '-',
      record.notes || '-',
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

/**
 * Saves the month's attendance as a CSV file.
 *
 * @param studentId - Whose report this is, for the file name.
 * @param periodLabel - The period, for the file name.
 * @param records - The rows to export.
 */
export function downloadAttendanceCsv(studentId: string, periodLabel: string, records: AttendanceCalendarDay[]): void {
  const blob = new Blob([buildAttendanceCsv(records)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-${studentId}-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
