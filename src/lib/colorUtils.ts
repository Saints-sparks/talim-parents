/**
 * Utility functions for generating consistent colors and initials
 * Used across the chat system for Google-style avatars
 */

// Google Material colors with good contrast for text on white backgrounds
const MATERIAL_COLORS = [
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#03A9F4', // Light Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#CDDC39', // Lime
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

/** What an avatar needs to draw itself. */
export interface AvatarProps {
  initials: string;
  backgroundColor: string;
  hasImage: boolean;
}

/**
 * Generate a consistent Google-style Material color based on a string.
 * The same string will always produce the same color.
 *
 * @param str - Any string, typically a person's name.
 * @returns A hex colour from the Material palette.
 */
export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorIndex = Math.abs(hash) % MATERIAL_COLORS.length;
  return MATERIAL_COLORS[colorIndex];
}

/**
 * Extract initials from a name for avatar display.
 *
 * @param name - A person's name.
 * @returns Up to 2 characters in uppercase, or "U" when there is no name.
 */
export function getUserInitials(name: string | null | undefined): string {
  if (!name) return 'U';

  const parts = name.split(' ').filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  } else if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return 'U';
}

/**
 * Get avatar props for consistent styling across the app.
 *
 * @param name - A person's name.
 * @param avatar - Their picture URL, if they have one.
 * @returns Initials, a background colour and whether a picture exists.
 */
export function getAvatarProps(name: string | null | undefined, avatar?: string | null): AvatarProps {
  const initials = getUserInitials(name);
  const backgroundColor = generateColorFromString(name || 'Unknown');

  return {
    initials,
    backgroundColor,
    hasImage: !!avatar,
  };
}
