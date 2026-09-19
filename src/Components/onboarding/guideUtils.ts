import { STORAGE_KEYS } from '../../lib/session';
import type { AuthUser } from '../../types/auth';
import type { GuideConfig, GuideStep } from './parentGuideSteps';

const STORAGE_PREFIX = 'talim_parent_guide';

/** The highlighted element's box, in viewport pixels. */
export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where the tour card sits and which edge its arrow points from. */
export interface CardPosition {
  top: string;
  left: string;
  transform: string;
  arrow: 'left' | 'right' | 'top' | 'bottom' | 'hidden';
}

/**
 * Finds a page element by its `data-guide` attribute.
 *
 * @param target - The attribute value.
 * @returns The element, or `null` when the page does not carry it.
 */
export function findGuideElement(target: string): Element | null {
  return document.querySelector(`[data-guide="${target}"]`);
}

/**
 * The on-screen box of a tour target.
 *
 * @param target - The `data-guide` value.
 * @returns The box, or `null` when the element is missing.
 */
export function getTargetRect(target: string): TargetRect | null {
  const element = findGuideElement(target);
  if (!element) return null;
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
}

/**
 * The steps whose target is actually on screen right now, so a tour never
 * points at something a smaller screen has hidden. Falls back to every step
 * when none is visible, so the tour is never empty.
 *
 * @param config - The page's tour.
 * @returns The steps to show.
 */
export function getVisibleSteps(config: GuideConfig): GuideStep[] {
  const visible = config.steps.filter((step) => {
    const element = findGuideElement(step.target);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden';
  });
  return visible.length > 0 ? visible : config.steps;
}

/**
 * Whose "seen" flags to read: the signed-in parent, else the last known one.
 *
 * @param user - The signed-in parent.
 * @returns A stable id, or "guest".
 */
export function getGuideUserId(user: AuthUser | null): string {
  return user?.userId || user?._id || user?.id || window.localStorage.getItem(STORAGE_KEYS.parentId) || 'guest';
}

/**
 * Storage key for "finished this tour".
 *
 * @param guideId - The tour's id.
 * @param userId - The parent's id.
 * @returns The localStorage key.
 */
export function getCompletedKey(guideId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${guideId}:completed`;
}

/**
 * Storage key for "opened or dismissed this tour once".
 *
 * @param guideId - The tour's id.
 * @param userId - The parent's id.
 * @returns The localStorage key.
 */
export function getSeenKey(guideId: string, userId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${guideId}:seen`;
}

/**
 * Places the tour card beside the target on wide screens, or above/below it on
 * phones, always inside the viewport.
 *
 * @param rect - The highlighted element's box, or `null` to centre the card.
 * @returns The card's CSS position and arrow side.
 */
export function getCardPosition(rect: TargetRect | null): CardPosition {
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', arrow: 'hidden' };
  }

  const cardWidth = Math.min(400, window.innerWidth - 32);
  const cardHeight = 330;
  const viewportPadding = 16;
  const spaceRight = window.innerWidth - (rect.left + rect.width);
  const spaceLeft = rect.left;
  const canUseSide = window.innerWidth >= 768 && (spaceRight > cardWidth + 32 || spaceLeft > cardWidth + 32);

  if (canUseSide) {
    const placeRight = spaceRight >= cardWidth + 32;
    const top = Math.min(
      Math.max(rect.top + rect.height / 2 - cardHeight / 2, viewportPadding),
      Math.max(viewportPadding, window.innerHeight - cardHeight - viewportPadding),
    );

    return {
      top: `${top}px`,
      left: placeRight
        ? `${Math.min(rect.left + rect.width + 24, window.innerWidth - cardWidth - viewportPadding)}px`
        : `${Math.max(rect.left - cardWidth - 24, viewportPadding)}px`,
      transform: 'none',
      arrow: placeRight ? 'left' : 'right',
    };
  }

  const below = rect.top + rect.height + 20;
  const fitsBelow = below + cardHeight < window.innerHeight;

  return {
    top: fitsBelow ? `${below}px` : `${Math.max(viewportPadding, rect.top - cardHeight - 20)}px`,
    left: `${Math.min(
      Math.max(rect.left + rect.width / 2 - cardWidth / 2, viewportPadding),
      window.innerWidth - cardWidth - viewportPadding,
    )}px`,
    transform: 'none',
    arrow: fitsBelow ? 'top' : 'bottom',
  };
}
