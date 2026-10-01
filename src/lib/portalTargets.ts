import type { PortalTarget } from '../types/portal/common';
import { buildQuery } from './apiClient';

/**
 * The app path a §30 target, an attention item or a notification leads to.
 * Unknown pages fall back to the dashboard rather than a dead link.
 *
 * @param target - Where the producer said to go.
 * @returns A path with its query.
 */
export function pathForTarget(target: PortalTarget | null | undefined): string {
  if (!target) return '/dashboard';
  switch (target.page) {
    case 'attendance':
      return '/attendance';
    case 'timetable':
      return '/timetable';
    case 'results':
    case 'grading':
      return `/results${buildQuery({ termId: target.termId })}`;
    case 'leave':
      return '/leave';
    case 'messages':
      return `/messages${buildQuery({ room: target.roomId })}`;
    case 'notifications':
      return '/notifications';
    case 'announcements':
      return '/notifications?filter=school';
    case 'payments':
      return '/payments';
    case 'settings':
      return '/settings';
    default:
      return '/dashboard';
  }
}
