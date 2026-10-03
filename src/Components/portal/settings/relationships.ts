import { firstNameOf } from '../../../lib/format';
import type { ChildSummary } from '../../../types/portal/children';
import type { Relationship } from '../../../types/portal/common';

/** How a relationship reads. */
const RELATIONSHIP: Record<Relationship, string> = { MOTHER: 'Mother', FATHER: 'Father', GUARDIAN: 'Guardian', OTHER: 'Relative' };

/**
 * "Father of Musa and Aisha · Guardian of Zainab": the parent's relationship
 * to each child, from the links (A11), grouped in one pass.
 *
 * @param children - The linked children.
 * @returns The sentence, or null when the API sends no relationships.
 */
export function relationshipLine(children: readonly ChildSummary[]): string | null {
  const groups = new Map<Relationship, string[]>();
  for (const child of children) {
    if (!child.relationship) continue;
    const names = groups.get(child.relationship) ?? [];
    names.push(firstNameOf(child.name));
    groups.set(child.relationship, names);
  }
  if (!groups.size) return null;
  const list = (names: string[]): string => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);
  return [...groups].map(([relation, names]) => `${RELATIONSHIP[relation]} of ${list(names)}`).join(' · ');
}
