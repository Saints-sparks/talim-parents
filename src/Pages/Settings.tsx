import { type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../services/auth.services';
import { useActiveChild } from '../hooks/useActiveChild';
import { AccountPanel } from '../Components/portal/settings/AccountPanel';
import { ChildrenPanel } from '../Components/portal/settings/ChildrenPanel';
import { MessagesPanel, NotificationsPanel } from '../Components/portal/settings/AlertPanels';
import { PaymentsPanel } from '../Components/portal/settings/PaymentsPanel';
import { SecurityPanel } from '../Components/portal/settings/SecurityPanel';
import { HelpPanel } from '../Components/portal/settings/HelpPanel';
import { AboutPanel } from '../Components/portal/settings/AboutPanel';
import { PageHeader } from '../Components/portal/ui/primitives';
import { card, cardTitle, focusRing } from '../Components/portal/ui/styles';

/** The tabs, in the design's order. */
const TABS = ['account', 'children', 'notifications', 'messages', 'payments', 'security', 'help', 'about'] as const;
export type SettingsTab = (typeof TABS)[number];

/**
 * Each tab's label, the line under it, and the panel's title and description.
 *
 * @param childCount - How many children are linked.
 * @param schoolCount - How many schools they attend.
 * @returns The copy per tab.
 */
function tabCopy(childCount: number, schoolCount: number): Record<SettingsTab, { label: string; desc: string; title: string; body: string }> {
  return {
    account: { label: 'Account', desc: 'Your parent profile', title: 'Account', body: 'The details the school holds for you.' },
    children: {
      label: 'Children',
      desc: `${childCount} linked · ${schoolCount} school${schoolCount === 1 ? '' : 's'}`,
      title: 'My children',
      body: `All ${childCount} ${childCount === 1 ? 'child' : 'children'} linked to this account, grouped by school. Pick one to view their portal: only that child is shown at a time.`,
    },
    notifications: { label: 'Notifications', desc: 'What you get told about', title: 'Notifications', body: 'Choose what the school may alert you about.' },
    messages: { label: 'Messages', desc: 'Messaging preferences', title: 'Messages', body: 'Control how you appear in conversations.' },
    payments: { label: 'Payments', desc: 'Methods and receipts', title: 'Payments', body: 'Your preferred method and how receipts reach you.' },
    security: { label: 'Security', desc: 'Password and sessions', title: 'Security', body: 'Keep your account safe.' },
    help: { label: 'Help', desc: 'Support and guides', title: 'Help & support', body: 'Guides written for parents.' },
    about: { label: 'About', desc: 'App information', title: 'About', body: 'App information and legal.' },
  };
}

/** Each tab's panel. */
const PANELS: Record<SettingsTab, () => JSX.Element> = {
  account: AccountPanel,
  children: ChildrenPanel,
  notifications: NotificationsPanel,
  messages: MessagesPanel,
  payments: PaymentsPanel,
  security: SecurityPanel,
  help: HelpPanel,
  about: AboutPanel,
};

/**
 * Account & settings: a tab list on the left (`?tab=` in the URL, so "Manage
 * children" and old links land on the right tab) and the tab's panel.
 *
 * @returns The page.
 */
export default function Settings() {
  const { user } = useAuth();
  const { children, groups } = useActiveChild();
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab') as SettingsTab | null;
  const tab: SettingsTab = asked && (TABS as readonly string[]).includes(asked) ? asked : 'account';
  const copy = tabCopy(children.length, groups.length);
  const Panel = PANELS[tab];
  const parentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Parent';

  /**
   * Opens a tab and records it in `?tab=` (no history entry).
   *
   * @param next - The tab.
   */
  const choose = (next: SettingsTab): void => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('tab', next);
    // A ticket thread belongs to Help; leaving the tab closes it.
    nextParams.delete('ticket');
    setParams(nextParams, { replace: true });
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    choose(next);
    document.getElementById(`settings-tab-${next}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Account & settings" subtitle={`${parentName} · parent account`} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 min-[760px]:grid-cols-[minmax(210px,280px)_minmax(0,1fr)]">
        <div role="tablist" aria-label="Settings" aria-orientation="vertical" className="rounded-[22px] border border-tl-line bg-tl-surface p-2.5">
          {TABS.map((key, index) => {
            const on = tab === key;
            return (
              <button
                key={key}
                id={`settings-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="settings-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => choose(key)}
                onKeyDown={(event) => onKey(event, index)}
                className={`block min-h-[44px] w-full rounded-[14px] px-3.5 py-3 text-left hover:bg-tl-subtle ${on ? 'bg-tl-select' : ''} ${focusRing}`}
              >
                <span className="block text-[15px] font-bold text-tl-ink">{copy[key].label}</span>
                <span className={`mt-0.5 block text-[13px] ${on ? 'text-tl-link' : 'text-tl-faint'}`}>{copy[key].desc}</span>
              </button>
            );
          })}
        </div>
        <section id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`} className={card}>
          <h2 className={cardTitle}>{copy[tab].title}</h2>
          <p className="mt-[5px] text-sm text-tl-muted">{copy[tab].body}</p>
          <Panel />
        </section>
      </div>
    </div>
  );
}
