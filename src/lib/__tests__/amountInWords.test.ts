import { describe, it, expect } from 'vitest';
import { amountInWords } from '../amountInWords';

describe('amountInWords', () => {
  it('spells small amounts', () => {
    expect(amountInWords(0)).toBe('Zero Naira Only');
    expect(amountInWords(7)).toBe('Seven Naira Only');
    expect(amountInWords(19)).toBe('Nineteen Naira Only');
  });

  it('spells tens and hundreds', () => {
    expect(amountInWords(42)).toBe('Forty Two Naira Only');
    expect(amountInWords(100)).toBe('One Hundred Naira Only');
    expect(amountInWords(250)).toBe('Two Hundred Fifty Naira Only');
  });

  it('spells thousands', () => {
    expect(amountInWords(50_000)).toBe('Fifty Thousand Naira Only');
    expect(amountInWords(12_500)).toBe('Twelve Thousand Five Hundred Naira Only');
  });

  it('rounds off any fractional kobo', () => {
    expect(amountInWords(1234.75)).toBe(amountInWords(1235));
  });
});
