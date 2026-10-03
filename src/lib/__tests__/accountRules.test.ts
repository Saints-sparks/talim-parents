import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizePhone } from '../accountRules';


describe('phone numbers', () => {
  it('strips separators before matching the API pattern', () => {
    expect(normalizePhone('+234 801-234 5678')).toBe('+2348012345678');
    expect(isValidPhone('0801 234 5678')).toBe(true);
    expect(isValidPhone('+234 701 234 5678')).toBe(true);
  });

  it('rejects numbers the API would refuse', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('0601 234 5678')).toBe(false);
  });
});
