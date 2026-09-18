const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
] as const;
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'] as const;

/**
 * Spells out a whole number of naira, for the "amount in words" line on a
 * printed receipt.
 *
 * @param value - A non-negative number; the fractional part is dropped.
 * @returns The amount in words, ending "Naira Only".
 */
export function amountInWords(value: number): string {
  const convert = (num: number): string => {
    if (num === 0) return 'Zero';
    if (num < 20) return ONES[num];
    if (num < 100) return TENS[Math.floor(num / 10)] + (num % 10 ? ` ${ONES[num % 10]}` : '');
    if (num < 1000) {
      return `${ONES[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${convert(num % 100)}` : ''}`;
    }
    if (num < 1_000_000) {
      return `${convert(Math.floor(num / 1000))} Thousand${num % 1000 ? ` ${convert(num % 1000)}` : ''}`;
    }
    return `${convert(Math.floor(num / 1_000_000))} Million${num % 1_000_000 ? ` ${convert(num % 1_000_000)}` : ''}`;
  };
  return `${convert(Math.round(Math.abs(value)))} Naira Only`;
}
