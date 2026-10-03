import { describe, expect, it } from 'vitest';
import { drawReceipts, pdfMoney, receiptFileName, receiptLayout, type PdfDoc } from '../receiptPdf';
import type { ParentReceipt } from '../../types/portal/payments';

const RECEIPT: ParentReceipt = {
  id: 'r1',
  receiptNumber: 'RCP-2026-000118',
  termId: 't1',
  termName: 'First term',
  session: '2026 / 2027',
  child: { id: 'c1', name: 'Musa Adele', admissionNumber: 'TAL/2026/JS1/0148', className: 'Jss1 A' },
  school: { name: 'Easy Sparks Education Center', logoUrl: null, address: '14 Oduduwa Crescent, Ikeja' },
  items: [
    { label: 'Tuition', amount: 90_000 },
    { label: 'Books and stationery', amount: 26_000 },
  ],
  total: 116_000,
  paidAt: '2026-09-04T10:00:00.000Z',
  method: 'bank_transfer',
  reference: 'FT123',
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
    const page = receiptLayout(RECEIPT);
    expect(page.schoolName).toBe('Easy Sparks Education Center');
    expect(page.details).toEqual(
      expect.arrayContaining([
        ['Receipt no.', 'RCP-2026-000118'],
        ['Date paid', '4 September 2026'],
        ['Student', 'Musa Adele'],
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
