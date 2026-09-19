import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names, dropping falsy ones and resolving Tailwind conflicts (the last one wins).
 *
 * @param inputs - Class names, arrays or `{ name: condition }` maps.
 * @returns One merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
