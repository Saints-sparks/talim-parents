import type { ChildUser, ParentChild } from '../../types/parent';

/**
 * Anyone the onboarding screens name: a child, or the signed-in parent.
 *
 * A child carries its user document under `userId`; the auth user's `userId`
 * is a plain string, so the two are told apart by that type.
 */
export interface NamedPerson {
  firstName?: string;
  lastName?: string;
  userAvatar?: string;
  avatar?: string;
  userId?: ChildUser | string;
}

/**
 * The nested user document, if this person has one.
 *
 * @param person - A child or the parent.
 * @returns The populated user, or an empty object.
 */
function nestedUser(person: NamedPerson | null | undefined): ChildUser {
  return typeof person?.userId === 'object' && person.userId !== null ? person.userId : {};
}

/**
 * First and last name, preferring the person's own fields over the nested user.
 *
 * @param person - A child or the parent.
 * @returns The two parts, either possibly empty.
 */
function nameParts(person: NamedPerson | null | undefined): { first: string; last: string } {
  const nested = nestedUser(person);
  return {
    first: person?.firstName ?? nested.firstName ?? '',
    last: person?.lastName ?? nested.lastName ?? '',
  };
}

/**
 * A display name.
 *
 * @param person - A child or the parent.
 * @returns "First Last", or "Not set" when the record has neither.
 */
export function getPersonName(person: NamedPerson | null | undefined): string {
  const { first, last } = nameParts(person);
  return [first, last].filter(Boolean).join(' ') || 'Not set';
}

/**
 * "Grade • Class" for a child, degrading to whatever the record has.
 *
 * @param ward - The child.
 * @returns The label shown under the child's name.
 */
export function getStudentClassLabel(ward: ParentChild | null | undefined): string {
  const className = ward?.className || 'Class not assigned';
  const grade = ward?.grade;
  return grade ? `${grade} • ${className}` : className;
}

/**
 * The person's photo URL.
 *
 * @param person - A child or the parent.
 * @returns The URL, or an empty string when there is no photo.
 */
export function getAvatarUrl(person: NamedPerson | null | undefined): string {
  return person?.avatar || nestedUser(person).userAvatar || person?.userAvatar || '';
}

/**
 * Initials for an avatar fallback.
 *
 * @param person - A child or the parent.
 * @returns Up to two capital letters, or "P" when the record has no name.
 */
export function getInitials(person: NamedPerson | null | undefined): string {
  const { first, last } = nameParts(person);
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || 'P';
}
