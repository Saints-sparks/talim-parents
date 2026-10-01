import type { ChildSummary } from '../../types/portal/children';

/** A populated user document, as some older records nest it under `userId`. */
interface ChildUser {
  firstName?: string;
  lastName?: string;
  userAvatar?: string;
}

/**
 * Anyone the onboarding screens name: the signed-in parent (or an older
 * record that nests its user document under `userId`).
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
 * "Class · School" for a child (B13), saying so when the school has not
 * placed the child in a class yet.
 *
 * @param ward - The child.
 * @returns The label shown under the child's name.
 */
export function getStudentClassLabel(ward: ChildSummary | null | undefined): string {
  if (!ward) return 'Class not assigned';
  return `${ward.class?.name ?? 'Class not assigned'} · ${ward.school.name}`;
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
