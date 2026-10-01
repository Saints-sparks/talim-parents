/**
 * B10 messages for parents. Hand-written; see `./common.ts` for how to swap
 * these for the generated contract.
 */

/** Which list a contact sits in. */
export type ContactGroup = 'class_teacher' | 'teacher' | 'office';

/**
 * One entry of `GET /chat/contacts?childId=` (B10, the §26 shape): the child's
 * class teacher and course teachers, plus an office entry (`userId: 'office'`).
 */
export interface ChatContact {
  userId: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  /** "Mathematics · teacher", "School office · Easy Sparks". */
  subtitle: string;
  group: ContactGroup;
  /** Only when the API gives one: Call is a `tel:` link, never an in-app call. */
  phone: string | null;
}

/** The fields of a chat room view (§27) this app reads when opening a thread. */
export interface OpenedRoom {
  _id?: string;
  roomId?: string;
  name?: string;
  type?: string;
  /** §27: the phone to call from this thread, when the API has one. */
  callPhone?: string | null;
}
