/**
 * B10 messages for parents, as the generated contract describes them.
 */
import type { Schema } from '../apiContract';

/**
 * One entry of `GET /chat/contacts?childId=` for a parent (B10): the child's
 * class teacher and course teachers, plus an office entry (`userId: 'office'`).
 * `phone` is always null for teachers (their numbers are not shared).
 */
export type ChatContact = Schema<'ParentChildContactDto'>;

/** Which list a contact sits in. */
export type ContactGroup = ChatContact['group'];

/** `POST /chat/office` (B10): the parent's office room of the child's school, as a §27 view. */
export type OfficeRoom = Schema<'ChatRoomViewDto'>;

/**
 * `POST /chat/rooms` for a direct message: the stored room, not a §27 view
 * (no `callPhone` or `subtitle`). `reused` is true when the room existed.
 */
export type CreatedRoom = Schema<'ChatRoomResponseDto'>;

/** Either answer: the fields this app reads when opening a thread. */
export type OpenedRoom = Pick<CreatedRoom, '_id'> & Partial<Pick<OfficeRoom, 'roomId' | 'name' | 'callPhone'>>;
