import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizePhone, validatePasswordChange } from '../accountRules';

const good = { currentPassword: 'Old#Pass1', newPassword: 'New#Pass22', confirmPassword: 'New#Pass22' };

describe('validatePasswordChange', () => {
  it('accepts a strong, confirmed password', () => {
    expect(validatePasswordChange(good)).toEqual({});
  });

  it('lists every rule the new password breaks', () => {
    const errors = validatePasswordChange({ ...good, newPassword: 'abc', confirmPassword: 'abc' });
    expect(errors.newPassword).toMatch(/8 characters.*upper-case.*number.*symbol/);
  });

  it('requires the current password and a matching confirmation', () => {
    const errors = validatePasswordChange({ ...good, currentPassword: '', confirmPassword: 'other' });
    expect(errors.currentPassword).toBeDefined();
    expect(errors.confirmPassword).toMatch(/do not match/);
  });

  it('rejects reusing the current password', () => {
    const errors = validatePasswordChange({ ...good, currentPassword: 'New#Pass22' });
    expect(errors.newPassword).toBeDefined();
  });
});

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
