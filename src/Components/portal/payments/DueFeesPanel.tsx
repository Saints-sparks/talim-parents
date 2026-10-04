import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { dayMonth, naira } from '../../../lib/format';
import { Pill } from '../ui/primitives';
import { focusRing, primaryButton, rowButton, type Tone } from '../ui/styles';
import type { FeeItem, FeeItemStatus } from '../../../types/portal/payments';

/** How each fee status reads. */
const STATUS: Record<FeeItemStatus, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'success' },
  part_paid: { label: 'Part paid', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'danger' },
  due: { label: 'Due', tone: 'warning' },
};

/** Props for {@link DueFeesPanel}. */
export interface DueFeesPanelProps {
  firstName: string;
  /** The child's items that still have a balance. */
  items: FeeItem[];
  /** Opens the checkout for these items. */
  onPay: (items: FeeItem[]) => void;
}

/**
 * The Due fees tab: each fee with its status, what is already paid, the
 * breakdown on demand, "Pay now", and ticks to pay several together
 * ("Pay selected"). A fee a checkout or bank transfer already holds
 * (`pendingPayment`) cannot be picked again: the server would refuse it (409).
 *
 * @param props - See {@link DueFeesPanelProps}.
 * @returns The panel.
 */
export function DueFeesPanel({ firstName, items, onPay }: DueFeesPanelProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const chosen = useMemo(() => items.filter((item) => !item.pendingPayment && selected.has(item.id)), [items, selected]);
  const outstanding = useMemo(() => items.reduce((sum, item) => sum + item.balance, 0), [items]);
  const chosenTotal = useMemo(() => chosen.reduce((sum, item) => sum + item.balance, 0), [chosen]);

  const toggle = (id: string): void =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (items.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-tl-line-soft bg-tl-subtle p-5 text-sm text-tl-muted">
        Nothing outstanding for {firstName}. Every fee this term is paid.
      </div>
    );
  }

  return (
    <div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <h3 className="text-base font-extrabold text-tl-ink">
            {items.length} fee{items.length === 1 ? '' : 's'} outstanding · {naira(outstanding)}
          </h3>
          <p className="mt-[3px] text-[13px] text-tl-faint" aria-live="polite">
            {chosen.length ? `${chosen.length} selected · ${naira(chosenTotal)}` : 'Tick the fees you want to pay together'}
          </p>
        </div>
        <button type="button" className={primaryButton} disabled={chosen.length === 0} onClick={() => onPay(chosen)}>
          Pay selected
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => {
          const held = item.pendingPayment;
          const on = !held && selected.has(item.id);
          const open = expanded === item.id;
          const status = STATUS[item.status];
          const breakdownId = `breakdown-${item.id}`;
          return (
            <li key={item.id} className="rounded-[18px] border border-tl-line-soft p-[18px]">
              <div className="flex flex-wrap items-start gap-3.5">
                <label className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${held ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${focusRing}`}>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={on}
                    disabled={held}
                    onChange={() => toggle(item.id)}
                    aria-label={held ? `${item.label}: a payment is pending` : `Select ${item.label}`}
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border text-white peer-focus-visible:ring-2 peer-focus-visible:ring-tl-link ${
                      on ? 'border-tl-brand-fill bg-tl-brand-fill' : 'border-tl-faint bg-tl-surface'
                    }`}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </label>
                <div className="min-w-[180px] flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-extrabold text-tl-ink">{item.label}</span>
                    <Pill tone={status.tone}>{status.label}</Pill>
                    {held ? <Pill tone="muted">Payment pending</Pill> : null}
                  </div>
                  <p className="mt-[5px] text-[13px] text-tl-muted">
                    {item.category}
                    {item.dueDate ? ` · due ${dayMonth(item.dueDate)}` : ''}
                  </p>
                  <p className="mt-[3px] text-[13px] text-tl-faint">
                    {item.paid > 0 ? `${naira(item.paid)} of ${naira(item.amount)} already paid` : `Full amount ${naira(item.amount)}`}
                    {item.allowPartial ? '' : ' · must be paid in full'}
                    {item.lateFee > 0 ? ` · includes ${naira(item.lateFee)} late fee` : ''}
                  </p>
                  {held ? (
                    <p className="mt-[3px] text-[13px] text-tl-muted">
                      A checkout or bank transfer is waiting on this fee. It can be paid again only if that one fails or is rejected.
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="whitespace-nowrap text-[19px] font-extrabold text-tl-ink">{naira(item.balance)}</div>
                  <div className="mt-0.5 text-xs text-tl-faint">to pay</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2.5">
                {item.parts.length ? (
                  <button type="button" className={rowButton} aria-expanded={open} aria-controls={breakdownId} onClick={() => setExpanded(open ? null : item.id)}>
                    {open ? 'Hide breakdown' : 'View breakdown'}
                  </button>
                ) : null}
                {held ? null : (
                  <button type="button" className={`${primaryButton} !min-h-[44px] !rounded-xl !px-[18px] !py-2.5 !text-[13px]`} onClick={() => onPay([item])} aria-label={`Pay now: ${item.label}`}>
                    Pay now
                  </button>
                )}
              </div>
              {open ? (
                <ul id={breakdownId} className="mt-3.5 flex flex-col border-t border-tl-line-soft pt-3">
                  {item.parts.map((part) => (
                    <li key={part.label} className="flex items-center gap-3 py-[9px] text-sm">
                      <span className="flex-1 text-tl-muted">{part.label}</span>
                      <span className="font-bold text-tl-ink">{naira(part.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
