import { amountInWords } from './amountInWords';
import { longDate } from './format';
import type { ParentReceipt, PaymentMethodName } from '../types/portal/payments';

/**
 * Receipt PDFs, built in the browser with jspdf (C5): one receipt, or every
 * receipt of a term in one file. The layout is computed by
 * {@link receiptLayout}, a pure function, so it can be tested without a PDF.
 */

/** How a payment method reads on a receipt. */
const METHOD_NAMES: Record<string, string> = {
  paystack: 'Paystack',
  opay: 'OPay',
  stripe: 'Stripe',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  other: 'Other',
};

/**
 * The name of a payment method.
 *
 * @param method - The method key.
 * @returns e.g. "Bank transfer".
 */
export function methodName(method: PaymentMethodName | string): string {
  return METHOD_NAMES[method] ?? method;
}

/**
 * Money for the PDF. The built-in PDF fonts have no naira sign, so the
 * currency code is written instead of a glyph that would print as a box.
 *
 * @param amount - Naira.
 * @returns e.g. "NGN 30,000.00".
 */
export function pdfMoney(amount: number): string {
  return `NGN ${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** What one receipt page says, in order. */
export interface ReceiptLayout {
  schoolName: string;
  schoolAddress: string | null;
  title: string;
  details: [label: string, value: string][];
  items: [label: string, amount: string][];
  total: string;
  words: string;
}

/**
 * The content of one receipt page.
 *
 * @param receipt - The receipt (C5).
 * @returns The page's text, top to bottom.
 */
export function receiptLayout(receipt: ParentReceipt): ReceiptLayout {
  const term = [receipt.termName, receipt.session].filter(Boolean).join(', ');
  const details: [string, string][] = [
    ['Receipt no.', receipt.receiptNumber],
    ['Date paid', longDate(receipt.paidAt)],
    ['Student', receipt.child.name],
  ];
  if (receipt.child.admissionNumber) details.push(['Admission no.', receipt.child.admissionNumber]);
  if (receipt.child.className) details.push(['Class', receipt.child.className]);
  if (term) details.push(['Term', term]);
  details.push(['Paid with', methodName(receipt.method)]);
  if (receipt.reference) details.push(['Reference', receipt.reference]);
  return {
    schoolName: receipt.school.name,
    schoolAddress: receipt.school.address,
    title: 'School fees receipt',
    details,
    items: receipt.items.map((item) => [item.label, pdfMoney(item.amount)]),
    total: pdfMoney(receipt.total),
    words: amountInWords(receipt.total),
  };
}

/** The part of jspdf's document the builder uses (so tests can pass a fake). */
export interface PdfDoc {
  addPage: () => unknown;
  setFont: (name: string, style: string) => unknown;
  setFontSize: (size: number) => unknown;
  setTextColor: (r: number, g: number, b: number) => unknown;
  setDrawColor: (r: number, g: number, b: number) => unknown;
  line: (x1: number, y1: number, x2: number, y2: number) => unknown;
  text: (text: string | string[], x: number, y: number, options?: { align?: 'left' | 'right' | 'center' }) => unknown;
  splitTextToSize: (text: string, width: number) => string[];
  save: (filename: string) => unknown;
}

/**
 * Draws receipts onto a document, one page each.
 *
 * @param doc - A jspdf document (A4, millimetres).
 * @param receipts - The receipts, in order.
 * @returns The same document.
 */
export function drawReceipts<T extends PdfDoc>(doc: T, receipts: readonly ParentReceipt[]): T {
  receipts.forEach((receipt, index) => {
    if (index > 0) doc.addPage();
    const page = receiptLayout(receipt);
    let y = 22;
    doc.setTextColor(11, 46, 94);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(page.schoolName, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(91, 107, 128);
    if (page.schoolAddress) doc.text(page.schoolAddress, 20, (y += 6));
    doc.setFontSize(12);
    doc.setTextColor(15, 27, 46);
    doc.setFont('helvetica', 'bold');
    doc.text(page.title.toUpperCase(), 190, 22, { align: 'right' });
    doc.setDrawColor(230, 234, 242);
    doc.line(20, (y += 6), 190, y);

    doc.setFontSize(10);
    y += 8;
    for (const [label, value] of page.details) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(91, 107, 128);
      doc.text(label, 20, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 27, 46);
      doc.text(value, 60, y);
      y += 6;
    }

    y += 4;
    doc.line(20, y, 190, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 20, y);
    doc.text('Amount', 190, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    for (const [label, amount] of page.items) {
      y += 7;
      doc.text(label, 20, y);
      doc.text(amount, 190, y, { align: 'right' });
    }
    y += 5;
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total paid', 20, y);
    doc.text(page.total, 190, y, { align: 'right' });
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(91, 107, 128);
    doc.text(doc.splitTextToSize(page.words, 170), 20, y);
    doc.text('Issued by the school through Talim. Keep this receipt for your records.', 20, 280);
  });
  return doc;
}

/**
 * Builds the PDF and saves it to the parent's downloads. jspdf is loaded
 * only when a receipt is downloaded, so it stays out of the first page load.
 *
 * @param receipts - One receipt, or a term's receipts.
 * @param filename - The file name, ending in `.pdf`.
 * @returns Resolves once the download has been handed to the browser.
 */
export async function downloadReceiptsPdf(receipts: readonly ParentReceipt[], filename: string): Promise<void> {
  if (receipts.length === 0) return;
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawReceipts(doc as unknown as PdfDoc, receipts).save(filename);
}

/**
 * A safe file name for a receipt PDF.
 *
 * @param parts - Words to join ("Musa Adele", "First term", "2026 / 2027").
 * @returns e.g. `receipts-musa-adele-first-term-2026-2027.pdf`.
 */
export function receiptFileName(...parts: (string | null | undefined)[]): string {
  const slug = parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `receipts-${slug || 'talim'}.pdf`;
}
