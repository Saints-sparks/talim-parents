import { getErrorMessage } from '../../../lib/apiError';
import { Avatar } from '../ui/primitives';
import { focusRing } from '../ui/styles';
import type { ChatContact, ContactGroup } from '../../../types/portal/messages';

/** The order and headings of the contact groups. */
const GROUPS: { key: ContactGroup; label: string }[] = [
  { key: 'class_teacher', label: 'Class teacher' },
  { key: 'teacher', label: 'Teachers' },
  { key: 'office', label: 'School office' },
];

/** Props for {@link StartConversation}. */
export interface StartConversationProps {
  firstName: string;
  contacts: ChatContact[] | undefined;
  isPending: boolean;
  error: unknown;
  /** The contact being opened, while it opens. */
  opening: string | null;
  openError: unknown;
  onOpen: (contact: ChatContact) => void;
}

/**
 * "Start a conversation" under the room list: the active child's class
 * teacher, course teachers and the school office (B10), each opening (or
 * creating) the thread with them.
 *
 * @param props - See {@link StartConversationProps}.
 * @returns The section.
 */
export function StartConversation({ firstName, contacts, isPending, error, opening, openError, onOpen }: StartConversationProps) {
  return (
    <section className="mt-3 border-t border-tl-line-soft px-1 pt-4" aria-labelledby="start-conversation">
      <h3 id="start-conversation" className="px-2 text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint">
        Start a conversation about {firstName}
      </h3>
      {isPending ? <div role="status" aria-label="Loading contacts" className="mx-2 mt-3 h-16 animate-pulse rounded-xl bg-tl-track" /> : null}
      {error ? <p className="px-2 pt-3 text-[13px] text-tl-danger">{getErrorMessage(error, "The school's contacts couldn't be loaded.")}</p> : null}
      {openError ? (
        <p role="alert" className="px-2 pt-3 text-[13px] text-tl-danger">
          {getErrorMessage(openError, 'That conversation could not be opened.')}
        </p>
      ) : null}
      {GROUPS.map((group) => {
        const people = (contacts ?? []).filter((contact) => contact.group === group.key);
        if (!people.length) return null;
        return (
          <div key={group.key} className="mt-3" role="group" aria-label={group.label}>
            <div className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-tl-faint">{group.label}</div>
            {people.map((contact) => (
              <button
                key={contact.userId}
                type="button"
                onClick={() => onOpen(contact)}
                disabled={opening !== null}
                aria-busy={opening === contact.userId || undefined}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-tl-subtle disabled:opacity-60 ${focusRing}`}
              >
                <Avatar id={contact.userId} name={contact.name} src={contact.avatarUrl} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-tl-ink">{contact.name}</span>
                  <span className="block truncate text-xs text-tl-muted">{contact.subtitle}</span>
                </span>
                <span className="text-xs font-bold text-tl-link">{opening === contact.userId ? 'Opening…' : 'Message'}</span>
              </button>
            ))}
          </div>
        );
      })}
    </section>
  );
}
