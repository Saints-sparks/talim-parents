import { useCallback, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { percent } from '../../../lib/format';
import { Avatar } from '../ui/primitives';
import { focusRing } from '../ui/styles';
import { useDismiss } from './useDismiss';
import type { ChildSummary } from '../../../types/portal/children';

/**
 * The meta line under a child in the switcher: class and attendance.
 *
 * @param child - The child.
 * @returns e.g. "Jss1 A · 94% attendance".
 */
function switcherMeta(child: ChildSummary): string {
  const cls = child.class?.name ?? 'No class yet';
  return child.attendanceRate === null ? cls : `${cls} · ${percent(child.attendanceRate)} attendance`;
}

/**
 * The top bar's child switcher: the active child's name, class and school,
 * opening a list of every linked child grouped by school (B13). Choosing a
 * child sets the active child, which every child-scoped request then sends as
 * `X-Talim-Child`; "Manage children" goes to Settings › Children.
 *
 * Keyboard: the trigger is a button with `aria-expanded`; Escape or a click
 * outside closes the list and focus returns to the trigger.
 *
 * @returns The switcher.
 */
export function ChildSwitcher() {
  const navigate = useNavigate();
  const { child, groups, status, select } = useActiveChild();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismiss(ref, open, close);

  if (status !== 'ready' || !child) {
    return (
      <div className="flex min-h-[44px] items-center rounded-[15px] border border-tl-line px-3.5 text-sm font-bold text-tl-muted">
        {status === 'loading' ? 'Loading children…' : status === 'error' ? "Children couldn't load" : 'No child linked'}
      </div>
    );
  }

  const choose = (next: ChildSummary): void => {
    select(next.id);
    close();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Viewing ${child.name}. Switch child`}
        title="Switch between your children"
        className={`flex min-h-[44px] items-center gap-2.5 rounded-[15px] border border-tl-line py-2 pl-2.5 pr-3.5 text-left hover:bg-tl-subtle ${focusRing}`}
      >
        <Avatar id={child.id} name={child.name} src={child.avatarUrl} size={38} />
        <span className="min-w-0">
          <span className="block whitespace-nowrap text-[15px] font-extrabold tracking-[-0.2px] text-tl-ink">{child.name}</span>
          <span className="block whitespace-nowrap text-xs text-tl-muted">
            {(child.class?.name ?? 'No class yet') + ' · ' + child.school.name}
          </span>
        </span>
        <ChevronDown className="ml-0.5 h-4 w-4 text-tl-faint" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute left-0 top-[calc(100%+10px)] z-30 w-[min(340px,86vw)] rounded-[20px] border border-tl-line bg-tl-surface p-2.5 shadow-[0_20px_50px_-20px_rgba(15,27,46,0.35)]"
        >
          <p className="px-3 pb-1 pt-2 text-[13px] leading-normal text-tl-muted">You are viewing one child at a time.</p>
          {groups.map((group) => (
            <div key={group.school.id} role="group" aria-label={group.school.name}>
              <div className="px-3 pb-1.5 pt-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-tl-faint">{group.school.name}</div>
              {group.children.map((entry) => {
                const active = entry.id === child.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => choose(entry)}
                    aria-current={active ? 'true' : undefined}
                    title={`View ${entry.name.split(' ')[0]}'s portal`}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-tl-subtle ${active ? 'bg-tl-select' : ''} ${focusRing}`}
                  >
                    <Avatar id={entry.id} name={entry.name} src={entry.avatarUrl} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-extrabold text-tl-ink">{entry.name}</span>
                      <span className="block text-[13px] text-tl-muted">{switcherMeta(entry)}</span>
                    </span>
                    {active ? <Check className="h-4 w-4 text-tl-success" aria-label="Currently viewing" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/settings?tab=children');
            }}
            className={`mt-1.5 flex min-h-[44px] w-full items-center border-t border-tl-line-soft px-3 pb-2 pt-3.5 text-left text-sm font-bold text-tl-link ${focusRing}`}
          >
            Manage children →
          </button>
        </div>
      ) : null}
    </div>
  );
}
