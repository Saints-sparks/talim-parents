import { api, buildQuery } from '../../lib/apiClient';
import type { ChatContact, OpenedRoom } from '../../types/portal/messages';

/**
 * B10 for parents: who the parent can write to about one child, and opening
 * those threads. All three are child-scoped (the child decides the school).
 */

/**
 * The child's class teacher and course teachers, plus the school office.
 *
 * @param childId - Student record id of a linked child.
 * @returns The contacts; the office entry has `userId: 'office'`.
 * @throws {ApiError} `NOT_FOUND` when the child is not linked to this parent.
 */
export function getChatContacts(childId: string): Promise<ChatContact[]> {
  return api.get<ChatContact[]>(`/chat/contacts${buildQuery({ childId })}`, { childId });
}

/**
 * Opens (creating on first use) the parent's thread with the school office of
 * the child's school: one room per school and parent.
 *
 * @param childId - Student record id of a linked child.
 * @returns The office room.
 * @throws {ApiError} On any non-2xx.
 */
export function openOfficeRoom(childId: string): Promise<OpenedRoom> {
  // No body: the school comes from the child header, as for every child-scoped route.
  return api.post<OpenedRoom>('/chat/office', undefined, { childId });
}

/**
 * Opens (creating on first use) a one-to-one thread with one of the child's
 * teachers.
 *
 * @param childId - Student record id of a linked child.
 * @param teacherUserId - The teacher's user id, from {@link getChatContacts}.
 * @returns The room.
 * @throws {ApiError} `FORBIDDEN` when that teacher does not teach the child.
 */
export function openTeacherRoom(childId: string, teacherUserId: string): Promise<OpenedRoom> {
  return api.post<OpenedRoom>('/chat/rooms', { type: 'one_to_one', participants: [teacherUserId] }, { childId });
}

/**
 * The id of a room view, whichever key the API used.
 *
 * @param room - The room.
 * @returns The id, or an empty string.
 */
export function openedRoomId(room: OpenedRoom | null | undefined): string {
  return String(room?.roomId ?? room?._id ?? '');
}
