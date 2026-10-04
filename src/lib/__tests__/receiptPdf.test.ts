import { describe, expect, it } from 'vitest';
import { drawReceipts, pdfMoney, receiptFileName, receiptLayout, receiptMethod, studentLookup, type PdfDoc } from '../receiptPdf';
import type { ParentReceipt } from '../../types/portal/payments';

/** A C5 receipt as `GET /payments/parent/receipts` returns it (a bank transfer). */
const RECEIPT: ParentReceipt = {
  id: 'r1',
  _id: 'r1',
  schoolId: 's1',
  parentId: 'p1',
  studentId: 'c1',
  transactionId: 't1',
  termId: 't1',
  receiptNumber: 'RCP-2026-000118',
  feeItems: [],
  subtotal: 116_000,
  lateFee: 0,
  discount: 0,
  totalPaid: 116_000,
  currency: 'NGN',
  paymentMethod: 'bank_transfer',
  paymentProvider: '',
  transactionReference: 'FT123',
  paymentDate: '2026-09-04T10:00:00.000Z',
  receiptPdfUrl: '',
  verificationCode: '',
  verificationQrUrl: '',
  status: 'issued',
  issuedAt: '2026-09-04T10:00:00.000Z',
  createdAt: '2026-09-04T10:00:00.000Z',
  updatedAt: '2026-09-04T10:00:00.000Z',
  school: { id: 's1', name: 'Easy Sparks Education Center', logo: '', address: '14 Oduduwa Crescent, Ikeja' },
  child: { id: 'c1', name: 'Musa Adele' },
  term: { id: 't1', name: 'First term', session: '2026 / 2027' },
  items: [
    { feeAssignmentId: 'fa1', label: 'Tuition', category: 'Tuition fee', amount: 90_000 },
    { feeAssignmentId: 'fa2', label: 'Books and stationery', category: 'Materials', amount: 26_000 },
  ],
  downloadAllowed: true,
};

/**
 * A fake jspdf document that records every call.
 *
 * @returns The fake and its log.
 */
function fakeDoc() {
  const texts: string[] = [];
  let pages = 1;
  let saved = '';
  const doc: PdfDoc = {
    addPage: () => (pages += 1),
    setFont: () => undefined,
    setFontSize: () => undefined,
    setTextColor: () => undefined,
    setDrawColor: () => undefined,
    line: () => undefined,
    text: (text) => texts.push(...(Array.isArray(text) ? text : [text])),
    splitTextToSize: (text) => [text],
    save: (name) => (saved = name),
  };
  return { doc, texts, pages: () => pages, saved: () => saved };
}

describe('receipt PDF builder', () => {
  it('lays out the school header, the details, the lines, the total and the amount in words', () => {
    const page = receiptLayout(RECEIPT, { admissionNumber: 'TAL/2026/JS1/0148', className: 'Jss1 A' });
    expect(page.schoolName).toBe('Easy Sparks Education Center');
    expect(page.details).toEqual(
      expect.arrayContaining([
        ['Receipt no.', 'RCP-2026-000118'],
        ['Date paid', '4 September 2026'],
        ['Student', 'Musa Adele'],
        ['Admission no.', 'TAL/2026/JS1/0148'],
        ['Class', 'Jss1 A'],
        ['Term', 'First term, 2026 / 2027'],
        ['Paid with', 'Bank transfer'],
        ['Reference', 'FT123'],
      ]),
    );
    expect(page.items).toEqual([
      ['Tuition', 'NGN 90,000.00'],
      ['Books and stationery', 'NGN 26,000.00'],
    ]);
    expect(page.total).toBe('NGN 116,000.00');
    expect(page.words).toBe('One Hundred Sixteen Thousand Naira Only');
  });

  it('names the provider of an online payment, else the recorded method', () => {
    expect(receiptMethod({ paymentProvider: 'paystack', paymentMethod: 'card' })).toBe('Paystack');
    expect(receiptMethod({ paymentProvider: '', paymentMethod: 'pos' })).toBe('POS');
    expect(receiptMethod({ paymentProvider: '', paymentMethod: 'cash' })).toBe('Cash');
  });

  it('takes the admission number and class from the children list, which the receipt lacks', () => {
    const lookup = studentLookup([{ id: 'c1', admissionNumber: 'TAL/1', class: { id: 'k', name: 'Jss1 A' } }]);
    expect(lookup('c1')).toEqual({ admissionNumber: 'TAL/1', className: 'Jss1 A' });
    expect(lookup('other')).toBeUndefined();
    expect(receiptLayout(RECEIPT).details.map(([label]) => label)).not.toContain('Admission no.');
  });

  it('writes money with the currency code, which the PDF fonts can print', () => {
    expect(pdfMoney(1234.5)).toBe('NGN 1,234.50');
  });

  it('draws one page per receipt for a term bundle', () => {
    const fake = fakeDoc();
    drawReceipts(fake.doc, [RECEIPT, { ...RECEIPT, id: 'r2', receiptNumber: 'RCP-2026-000119' }, { ...RECEIPT, id: 'r3', receiptNumber: 'RCP-2026-000120' }]);
    expect(fake.pages()).toBe(3);
    expect(fake.texts).toEqual(expect.arrayContaining(['RCP-2026-000118', 'RCP-2026-000119', 'RCP-2026-000120', 'NGN 116,000.00']));
    expect(fake.texts.join(' ')).not.toContain('₦');
  });

  it('names the file after the child and the term', () => {
    expect(receiptFileName('Musa Adele', 'First term', '2026 / 2027')).toBe('receipts-musa-adele-first-term-2026-2027.pdf');
  });

  it('builds a real PDF with jspdf', async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    drawReceipts(doc as unknown as PdfDoc, [RECEIPT, RECEIPT]);
    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000);
  });
});
