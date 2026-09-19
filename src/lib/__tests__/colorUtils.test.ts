import { describe, it, expect } from 'vitest';
import { MATERIAL_COLORS, generateColorFromString, getAvatarProps, getUserInitials } from '../colorUtils';

describe('generateColorFromString', () => {
  it('is stable for the same string', () => {
    expect(generateColorFromString('Ada Lovelace')).toBe(generateColorFromString('Ada Lovelace'));
  });

  it('always returns a hex colour from the palette', () => {
    for (const name of ['', 'a', 'Grace Hopper', 'Ünïcödé', 'x'.repeat(200)]) {
      expect(generateColorFromString(name)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('spreads different names across more than one colour', () => {
    const colors = new Set(['Ada', 'Grace', 'Alan', 'Linus', 'Margaret', 'Dennis'].map(generateColorFromString));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('getUserInitials', () => {
  it('takes the first letters of the first two words', () => {
    expect(getUserInitials('ada lovelace')).toBe('AL');
    expect(getUserInitials('Mary Jane Watson')).toBe('MJ');
  });

  it('takes two letters of a single word', () => {
    expect(getUserInitials('Cher')).toBe('CH');
    expect(getUserInitials('X')).toBe('X');
  });

  it('ignores extra spaces', () => {
    expect(getUserInitials('  Ada   Lovelace ')).toBe('AL');
  });

  it('falls back to "U" for nothing', () => {
    expect(getUserInitials('')).toBe('U');
    expect(getUserInitials('   ')).toBe('U');
    expect(getUserInitials(null)).toBe('U');
    expect(getUserInitials(undefined)).toBe('U');
  });
});

describe('getAvatarProps', () => {
  it('bundles initials, colour and whether there is a picture', () => {
    expect(getAvatarProps('Ada Lovelace', 'https://x/a.png')).toEqual({
      initials: 'AL',
      backgroundColor: generateColorFromString('Ada Lovelace'),
      hasImage: true,
    });
    expect(getAvatarProps('Ada Lovelace').hasImage).toBe(false);
  });

  it('colours a missing name as "Unknown"', () => {
    expect(getAvatarProps(null).backgroundColor).toBe(generateColorFromString('Unknown'));
  });
});

describe('palette contrast', () => {
  /** WCAG relative luminance of a #RRGGBB colour. */
  const luminance = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  it('every colour is readable against white (AA, 4.5:1)', () => {
    for (const color of MATERIAL_COLORS) {
      expect({ color, ok: 1.05 / (luminance(color) + 0.05) >= 4.5 }).toEqual({ color, ok: true });
    }
  });
});
