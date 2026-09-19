import { useState } from 'react';
import { TbFileDownload } from 'react-icons/tb';
import { IoMdTime } from 'react-icons/io';
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from 'react-icons/ai';
import { MdArrowBackIos, MdArrowForwardIos } from 'react-icons/md';
import { FiPlus } from 'react-icons/fi';
import { toast } from './CustomToast';
import { logger } from '../lib/logger';
import type { LeaveRequest } from '../services/leaveRequest.services';

const ROWS_PER_PAGE_OPTIONS = [4, 5, 10, 20];
const COLUMNS = ['Request Date', 'Leave Period', 'Type', 'Status', 'Actions'];

const PAGE_SELECT =
  'rounded-md border-gray-300 py-1 pl-2 pr-8 text-sm focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
const PAGE_BUTTON =
  'rounded-md p-1 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-slate-800';

/**
 * A date as "Jun 12, 2026".
 *
 * @param dateString - An ISO date, or nothing.
 * @returns The formatted date, or an empty string.
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * "Jun 12, 2026 - Jun 14, 2026".
 *
 * @param startDate - First day.
 * @param endDate - Last day.
 * @returns The period, or an empty string when either end is missing.
 */
function formatLeavePeriod(startDate: string | undefined, endDate: string | undefined): string {
  if (!startDate || !endDate) return '';
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * The request's status as a coloured pill. The API's `LeaveStatus` is
 * Pending | Approved | Rejected; an unknown value renders neutral.
 *
 * @param props - Component props.
 * @param props.status - The status the API sent.
 * @returns The pill.
 */
function StatusBadge({ status }: { status: string | undefined }) {
  const value = status?.toUpperCase();
  const tone =
    value === 'APPROVED'
      ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
      : value === 'PENDING'
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300'
        : value === 'REJECTED'
          ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
          : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {value === 'APPROVED' && <AiOutlineCheckCircle className="h-4 w-4" aria-hidden="true" />}
      {value === 'PENDING' && <IoMdTime className="h-4 w-4" aria-hidden="true" />}
      {value === 'REJECTED' && <AiOutlineCloseCircle className="h-4 w-4" aria-hidden="true" />}
      {value ? value.charAt(0) + value.slice(1).toLowerCase() : ''}
    </span>
  );
}

/**
 * Saves one leave request as a PDF. jsPDF is loaded on demand: it is large and
 * most visits never download anything.
 *
 * @param request - The request to export.
 */
async function downloadLeaveRequestPdf(request: LeaveRequest): Promise<void> {
  const { default: JsPdf } = await import('jspdf');
  const doc = new JsPdf();

  doc.setFontSize(18);
  doc.text('Leave Request Details', 14, 20);

  doc.setFontSize(12);
  doc.text(`Request Date: ${formatDate(request.createdAt)}`, 14, 40);
  doc.text(`Leave Period: ${formatLeavePeriod(request.startDate, request.endDate)}`, 14, 50);
  doc.text(`Leave Type: ${request.leaveType}`, 14, 60);
  doc.text(`Status: ${request.status}`, 14, 70);

  if (request.reason) {
    doc.text('Reason:', 14, 80);
    doc.text(request.reason, 14, 90, { maxWidth: 180 });
  }

  doc.save(`leave-request-${request._id || Date.now()}.pdf`);
}

/** Props for {@link LeaveRequestTable}. */
interface LeaveRequestTableProps {
  leaveRequests: LeaveRequest[];
  /** Opens the new-request form (the phone layout's "+" button). */
  onNewRequest: () => void;
}

/**
 * The child's leave requests: a paged table on desktop and cards on a phone,
 * each with a PDF download.
 *
 * @param props - Component props.
 * @returns The table.
 */
export default function LeaveRequestTable({ leaveRequests, onNewRequest }: LeaveRequestTableProps) {
  const [requestedPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);

  const totalPages = Math.max(1, Math.ceil(leaveRequests.length / rowsPerPage));
  // A withdrawn request can leave the parent on a page that no longer exists.
  const currentPage = Math.min(requestedPage, totalPages);
  const currentRequests = leaveRequests.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleDownload = (request: LeaveRequest): void => {
    downloadLeaveRequestPdf(request).catch((error: unknown) => {
      logger.error('leave', 'Could not build the leave request PDF', error);
      toast.error('Could not create the PDF. Please try again.');
    });
  };

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
      {/* Desktop / tablet */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-500 dark:text-slate-400">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {currentRequests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-6 py-3">{formatDate(request.createdAt)}</td>
                  <td className="whitespace-nowrap px-6 py-3">{formatLeavePeriod(request.startDate, request.endDate)}</td>
                  <td className="whitespace-nowrap px-6 py-3">{request.leaveType}</td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <button
                      type="button"
                      onClick={() => handleDownload(request)}
                      className="flex items-center gap-1 text-gray-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
                      title="Download Leave Request PDF"
                    >
                      <TbFileDownload size={20} aria-hidden="true" /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="leave-rows" className="text-sm text-gray-700 dark:text-slate-300">
                  Rows per page
                </label>
                <select
                  id="leave-rows"
                  className={PAGE_SELECT}
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {ROWS_PER_PAGE_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-700 dark:text-slate-300">
                Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, leaveRequests.length)} of{' '}
                {leaveRequests.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <label htmlFor="leave-page" className="sr-only">
                  Page
                </label>
                <select
                  id="leave-page"
                  className={PAGE_SELECT}
                  value={currentPage}
                  onChange={(event) => setCurrentPage(Number(event.target.value))}
                >
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-700 dark:text-slate-300">of {totalPages}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  className={PAGE_BUTTON}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <MdArrowBackIos className="h-5 w-5 text-gray-500 dark:text-slate-400" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  className={PAGE_BUTTON}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  <MdArrowForwardIos className="h-5 w-5 text-gray-500 dark:text-slate-400" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="relative space-y-4 p-4 sm:hidden">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onNewRequest}
            className="flex items-center gap-2 rounded-md bg-[#003366] px-4 py-2 font-semibold text-white shadow hover:bg-[#002244] dark:bg-blue-600 dark:hover:bg-blue-500"
            aria-label="Create new leave request"
          >
            <FiPlus size={20} aria-hidden="true" />
          </button>
        </div>

        {currentRequests.map((request) => (
          <div
            key={request._id}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col space-y-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Request Date</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{formatDate(request.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Leave Period</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {formatLeavePeriod(request.startDate, request.endDate)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(request)}
                  className="mt-2 flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
                  title="Download Leave Request PDF"
                >
                  <TbFileDownload size={20} aria-hidden="true" /> Download
                </button>
              </div>

              <div className="flex flex-col items-end space-y-4">
                <StatusBadge status={request.status} />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Type</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{request.leaveType}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-md bg-gray-100 p-2 disabled:opacity-50 dark:bg-slate-800"
            aria-label="Previous page"
          >
            <MdArrowBackIos className="h-5 w-5 text-gray-500 dark:text-slate-400" aria-hidden="true" />
          </button>
          <span className="text-sm text-gray-700 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-md bg-gray-100 p-2 disabled:opacity-50 dark:bg-slate-800"
            aria-label="Next page"
          >
            <MdArrowForwardIos className="h-5 w-5 text-gray-500 dark:text-slate-400" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
