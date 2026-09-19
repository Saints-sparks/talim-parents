import type { School } from '../../services/school.services';

/**
 * Up to two initials from a name.
 *
 * @param name - A full name.
 * @param fallback - Shown when the name is empty.
 * @returns e.g. "AB".
 */
export function initialsOf(name: string, fallback = 'P'): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || fallback
  );
}

/**
 * A long date like "March 4, 2024".
 *
 * @param value - An ISO timestamp.
 * @returns The date, or "Not available" when missing or unusable.
 */
export function formatLongDate(value: string | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * The school's address on one line; the API may send a string or a structured
 * location.
 *
 * @param school - The parent's school.
 * @returns The address, or "Not available".
 */
export function schoolAddress(school: School | undefined): string {
  if (!school) return 'Not available';
  const raw: unknown = school.address ?? school.location;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    const place = raw as { street?: string; city?: string; state?: string; country?: string };
    const line = [place.street, place.city, place.state, place.country].filter(Boolean).join(', ');
    if (line) return line;
  }
  return 'Not available';
}

/**
 * The school's contact number.
 *
 * @param school - The parent's school.
 * @returns The number, or "Not available".
 */
export function schoolPhone(school: School | undefined): string {
  return school?.phoneNumber || 'Not available';
}
