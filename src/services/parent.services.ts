import { api, apiClient, buildQuery } from '../lib/apiClient';
import { logger } from '../lib/logger';
import { STORAGE_KEYS } from '../lib/session';
import type { ParentChild } from '../types/parent';

/**
 * The `/parents/me/*` endpoints. Every one of them is scoped server-side to
 * the signed-in parent (`getAuthenticatedParent` + `getLinkedStudent` in
 * `talimBE-V2/src/modules/user/service/parents.service.ts`), so a child id the
 * client sends that is not this parent's is refused with `FORBIDDEN` — the UI
 * never has to be the thing that keeps one parent out of another's data.
 */

/** The dashboard counters across every child. */
export interface ChildrenOverview {
  totalChildren: number;
  averageAttendance: number;
  averageGrade: number;
  totalSubjects: number;
  recentUpdates: ChildUpdate[];
}

/** One recent event on a child. */
export interface ChildUpdate {
  type: 'attendance' | 'result';
  title: string;
  description: string;
  childId: string;
  childName: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * One slot in a child's timetable. A `break` slot is the school-wide break the
 * API appends (`day: 'all'`); it carries a `title` and no subject or teacher.
 */
export interface TimetableSlot {
  day: string;
  date?: string;
  startTime: string;
  endTime: string;
  subjectName?: string;
  teacherName?: string;
  room?: string;
  type?: 'class' | 'break';
  title?: string;
}

/** One day of the list view. */
export interface TimetableDay {
  day: string;
  date: string;
  classes: TimetableSlot[];
}

/** What `GET /parents/me/children/:childId/timetable` returns. */
export interface ChildTimetable {
  child: ParentChild;
  weekRange: { start: string; end: string };
  weekDays: string[];
  timetableSlots: TimetableSlot[];
  todaySchedule: TimetableSlot[];
  listView: TimetableDay[];
  classInformation: { classTeacher?: string; roomNumber?: string; schoolName?: string };
}

/** Query accepted by the child timetable route. */
export interface ChildTimetableQuery {
  /** ISO date of the Monday to show. */
  weekStart?: string;
  view?: 'weekly' | 'list';
}

/**
 * Fills in the shapes older screens expect from a child, without inventing
 * data: every fallback here is another spelling of a field the API did send.
 *
 * @param child - A child as one of the endpoints returned it.
 * @returns The child with `_id` and `userId` populated.
 */
export function normalizeParentChild(child: ParentChild = {}): ParentChild {
  const firstName = child.firstName || child.userId?.firstName || '';
  const lastName = child.lastName || child.userId?.lastName || '';
  const childId = child.childId ?? child._id ?? child.userId?._id;

  return {
    ...child,
    childId,
    _id: child._id ?? childId,
    firstName,
    lastName,
    avatar: child.avatar || child.userId?.userAvatar,
    className: child.className || 'Class not assigned',
    schoolName: child.schoolName || 'School',
    userId: child.userId ?? {
      _id: child.childUserId ?? childId,
      firstName,
      lastName,
      userAvatar: child.avatar,
    },
    isActive: child.isActive !== false,
  };
}

/**
 * Every child linked to the signed-in parent.
 *
 * @returns The children, normalised.
 * @throws {ApiError} On any non-2xx.
 */
export async function getParentChildren(): Promise<ParentChild[]> {
  const body = await api.get<ParentChild[] | { children?: ParentChild[] }>('/parents/me/children');
  const children = Array.isArray(body) ? body : (body?.children ?? []);
  const normalized = children.map(normalizeParentChild);

  // Kept for the screens that read the last-known list before the query
  // resolves. Written here rather than in a component so there is one writer.
  try {
    window.localStorage.setItem(STORAGE_KEYS.children, JSON.stringify(normalized));
  } catch (error) {
    logger.warn('parent', 'Could not cache the children list', error);
  }

  return normalized;
}

/**
 * Alias kept for the modules that still import the older name.
 *
 * @returns The children, normalised.
 */
export const getStudentsByParent = getParentChildren;

/**
 * Attendance, grade and subject counters across every child.
 *
 * @returns The overview.
 * @throws {ApiError} On any non-2xx.
 */
export function getParentChildrenOverview(): Promise<ChildrenOverview> {
  return api.get<ChildrenOverview>('/parents/me/children/overview');
}

/**
 * Recent attendance and result events across every child.
 *
 * @returns At most eight updates, newest first.
 * @throws {ApiError} On any non-2xx.
 */
export function getParentChildrenUpdates(): Promise<ChildUpdate[]> {
  return api.get<ChildUpdate[]>('/parents/me/children/updates');
}

/**
 * Marks one child as the parent's default.
 *
 * @param childId - Student record id of a child linked to this parent.
 * @returns The confirmation the server sends back.
 * @throws {ApiError} `FORBIDDEN` when the child is not linked to this parent.
 */
export function setDefaultChild(childId: string): Promise<{ childId: string; message: string }> {
  return api.patch<{ childId: string; message: string }>(
    `/parents/me/default-child/${encodeURIComponent(childId)}`,
    {},
  );
}

/**
 * One child's timetable for a week.
 *
 * @param childId - Student record id of a child linked to this parent.
 * @param query - Which week, and which view the server should shape.
 * @returns The week's slots, today's schedule and the class information.
 * @throws {ApiError} `FORBIDDEN` when the child is not linked to this parent.
 */
export function getChildTimetable(
  childId: string,
  query: ChildTimetableQuery = {},
): Promise<ChildTimetable> {
  return api.get<ChildTimetable>(
    `/parents/me/children/${encodeURIComponent(childId)}/timetable${buildQuery({ ...query })}`,
  );
}

/**
 * One child's timetable as a CSV file.
 *
 * @param childId - Student record id of a child linked to this parent.
 * @returns The CSV, ready to hand to `URL.createObjectURL`.
 * @throws {ApiError} `FORBIDDEN` when the child is not linked to this parent.
 */
export function downloadChildTimetable(childId: string): Promise<Blob> {
  return apiClient.json<Blob>(
    `/parents/me/children/${encodeURIComponent(childId)}/timetable/download`,
    { method: 'GET', responseType: 'blob' },
  );
}

/**
 * Updates the signed-in parent's own profile.
 *
 * @param data - The fields to change; `FormData` when an avatar is included.
 * @returns The updated profile.
 * @throws {ApiError} `VALIDATION_FAILED` with per-field details.
 */
export function updateParentProfile<T = unknown>(data: unknown): Promise<T> {
  const parentId = window.localStorage.getItem(STORAGE_KEYS.parentId);
  if (!parentId) throw new Error('No signed-in parent.');
  return api.patch<T>(`/auth/profile/update/${encodeURIComponent(parentId)}`, data);
}

/**
 * The signed-in parent's profile record.
 *
 * @param parentId - Defaults to the signed-in parent.
 * @returns The parent profile.
 * @throws {ApiError} On any non-2xx.
 */
export function getParentByUserId<T = unknown>(parentId?: string): Promise<T> {
  const resolved = parentId || window.localStorage.getItem(STORAGE_KEYS.parentId);
  if (!resolved) throw new Error('No signed-in parent.');
  return api.get<T>(`/parents/user/${encodeURIComponent(resolved)}`);
}
