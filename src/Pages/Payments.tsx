import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useFamilyFees } from '../hooks/portal/usePortalPayments';
import { useParentSettings } from '../hooks/useParentSettings';
import { ChildGate } from '../Components/portal/ChildGate';
import { CheckoutDialog } from '../Components/portal/payments/CheckoutDialog';
import { DueFeesPanel } from '../Components/portal/payments/DueFeesPanel';
import { HistoryPanel } from '../Components/portal/payments/HistoryPanel';
import { ReceiptsPanel } from '../Components/portal/payments/ReceiptsPanel';
import { MethodsPanel } from '../Components/portal/payments/MethodsPanel';
import { EmptyCard, ErrorCard, LoadingCard, PageHeader, Pill } from '../Components/portal/ui/primitives';
import { card, cardFrame, countBadge, ghostButton, primaryButton, tile, underlineTab } from '../Components/portal/ui/styles';
import { firstNameOf, naira } from '../lib/format';
import type { ChildSummary } from '../types/portal/children';
import type { ChildFees, FeeItem } from '../types/portal/payments';

/** The tabs, in the design's order. */
const TABS = [
  { key: 'due', label: 'Due fees' },
  { key: 'history', label: 'Payment history' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'methods', label: 'Payment methods' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/**
 * The numbers the hero and the tiles show for one child's bill.
 *
 * @param bill - The child's bill (C2).
 * @returns The items still owed, those of them that can be paid now (no
 *   checkout or bank transfer holds them), and the percent paid.
 */
function billSummary(bill: ChildFees) {
  const due = bill.items.filter((item) => item.balance > 0);
  const payable = due.filter((item) => !item.pendingPayment);
  const paidPercent = bill.billTotal > 0 ? Math.round((bill.paid / bill.billTotal) * 100) : 100;
  return { due, payable, paidPercent };
}

/**
 * Payments for the active child, read from the family bill (C2: every child
 * in one request): the hero with "Pay all", four tiles, the Due fees,
 * History, Receipts and Methods tabs, and "Payment not showing?".
 *
 * @param props - The child.
 * @param props.child - The active child.
 * @returns The screen.
 */
function ChildPayments({ child }: { child: ChildSummary }) {
  const family = useFamilyFees();
  const settings = useParentSettings();
  const [tab, setTab] = useState<TabKey>('due');
  const [checkoutItems, setCheckoutItems] = useState<FeeItem[] | null>(null);
  const firstName = firstNameOf(child.name);

  const bill = useMemo(() => family.data?.children.find((entry) => entry.child.id === child.id) ?? null, [family.data, child.id]);
  const summary = useMemo(() => (bill ? billSummary(bill) : null), [bill]);
  const termLabel = bill?.term ? `${bill.term.name.toLowerCase()}, ${bill.term.session}` : undefined;
  const otherChildren = (family.data?.children.length ?? 0) > 1;

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].key);
    document.getElementById(`pay-tab-${TABS[next].key}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Payments" subtitle={[child.name, child.school.name, termLabel].filter(Boolean).join(' · ')} />

      {family.isPending ? <LoadingCard rows={3} label="Loading fees" /> : null}
      {family.isError ? <ErrorCard error={family.error} title="Fees couldn't be loaded" onRetry={() => void family.refetch()} /> : null}
      {family.data && !bill ? (
        <EmptyCard title={`No bill for ${firstName} yet`} message={`${child.school.name} has not issued fees for ${firstName} this term. They appear here as soon as it does.`} />
      ) : null}

      {bill && summary ? (
        <>
          <section className={card} aria-labelledby="outstanding-title">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="outstanding-title" className="text-[13px] font-bold text-tl-muted">
                  Outstanding balance
                </h2>
                <div className="mt-1.5 text-[clamp(32px,5vw,42px)] font-extrabold leading-[1.1] tracking-[-1.2px] text-tl-ink">
                  {bill.outstanding > 0 ? naira(bill.outstanding) : 'Cleared'}
                </div>
                <p className="mt-1.5 text-sm text-tl-muted">
                  {bill.outstanding > 0
                    ? `${naira(bill.paid)} paid of ${naira(bill.billTotal)} · ${summary.due.length} item${summary.due.length === 1 ? '' : 's'} left`
                    : `All fees for ${firstName} at ${child.school.name} are settled.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Pill tone={bill.outstanding > 0 ? 'warning' : 'success'} className="!px-4 !py-3 !text-sm">
                  {bill.outstanding > 0 ? (bill.paid > 0 ? 'Part paid' : 'Unpaid') : 'Fully paid'}
                </Pill>
                {bill.outstanding > 0 && summary.payable.length > 0 ? (
                  <button type="button" className={primaryButton} onClick={() => setCheckoutItems(summary.payable)} title="Pay everything still outstanding">
                    Pay all
                  </button>
                ) : null}
              </div>
            </div>
            <div
              className="mt-5 h-3 overflow-hidden rounded-full bg-tl-track"
              role="progressbar"
              aria-label="Share of the bill paid"
              aria-valuenow={summary.paidPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-3 rounded-full bg-tl-link" style={{ width: `${summary.paidPercent}%` }} />
            </div>
            <p className="mt-2.5 text-[13px] text-tl-faint">
              {summary.paidPercent}% of {termLabel ? `the ${termLabel} bill` : 'the bill'} has been paid.
              {otherChildren && family.data ? ` All your children: ${naira(family.data.totals.outstanding)} outstanding.` : ''}
            </p>
          </section>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
            {[
              { label: 'Outstanding', value: naira(bill.outstanding), tone: bill.outstanding > 0 ? 'text-tl-danger' : 'text-tl-success', note: `${summary.due.length} item${summary.due.length === 1 ? '' : 's'} left to pay`, tab: 'due' as const, link: 'View due fees →' },
              { label: 'Paid this session', value: naira(bill.paid), tone: 'text-tl-success', note: `${summary.paidPercent}% of the bill`, tab: 'history' as const, link: 'View payment history →' },
              { label: 'Receipts', value: String(family.data?.totals.receipts ?? 0), tone: 'text-tl-ink', note: otherChildren ? 'Across all your children' : 'Issued to your email', tab: 'receipts' as const, link: 'View receipts →' },
              { label: 'Overdue', value: naira(bill.overdue), tone: bill.overdue > 0 ? 'text-tl-danger' : 'text-tl-muted', note: bill.overdue > 0 ? 'Past the due date' : 'Nothing past due', tab: 'due' as const, link: bill.overdue > 0 ? 'Settle now →' : 'All clear' },
            ].map((entry) => (
              <button key={entry.label} type="button" className={tile} onClick={() => setTab(entry.tab)}>
                <span className="block text-[13px] font-bold text-tl-muted">{entry.label}</span>
                <span className={`mt-2 block text-[clamp(22px,2.6vw,27px)] font-extrabold tracking-[-0.6px] ${entry.tone}`}>{entry.value}</span>
                <span className="mt-1 block text-[13px] text-tl-faint">{entry.note}</span>
                <span className="mt-2.5 block text-[13px] font-bold text-tl-link">{entry.link}</span>
              </button>
            ))}
          </div>

          <section className={`${cardFrame} px-[clamp(18px,2.4vw,24px)] pb-[clamp(18px,2.4vw,26px)] pt-[clamp(14px,2vw,22px)]`}>
            <div role="tablist" aria-label="Payments" className="relative flex gap-[clamp(14px,2.4vw,28px)] overflow-x-auto border-b border-tl-line-soft">
              {TABS.map((entry, index) => {
                const on = tab === entry.key;
                const badge = entry.key === 'due' ? summary.due.length : 0;
                return (
                  <button
                    key={entry.key}
                    id={`pay-tab-${entry.key}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls={`pay-panel-${entry.key}`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(entry.key)}
                    onKeyDown={(event) => onTabKey(event, index)}
                    className={underlineTab(on)}
                  >
                    {entry.label}
                    {badge > 0 ? (
                      <span className={countBadge} aria-label={`${badge} due`}>
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div id={`pay-panel-${tab}`} role="tabpanel" aria-labelledby={`pay-tab-${tab}`}>
              {tab === 'due' ? <DueFeesPanel firstName={firstName} items={summary.due} onPay={setCheckoutItems} /> : null}
              {tab === 'history' ? <HistoryPanel childId={child.id} /> : null}
              {tab === 'receipts' ? <ReceiptsPanel childId={child.id} childName={child.name} termId={bill.term?.id} termLabel={termLabel} /> : null}
              {tab === 'methods' ? <MethodsPanel childId={child.id} schoolName={child.school.name} /> : null}
            </div>
          </section>

          <CheckoutDialog
            open={checkoutItems !== null}
            onClose={() => setCheckoutItems(null)}
            child={{ id: child.id, name: child.name, schoolName: child.school.name }}
            items={checkoutItems ?? []}
            minimumPartPayment={bill.minimumPartPayment}
            preferred={settings.data?.preferences.preferredProvider ?? null}
          />
        </>
      ) : null}

      <section className="flex flex-wrap items-center gap-4 rounded-[20px] border border-tl-line bg-tl-surface px-[22px] py-5">
        <div className="min-w-[240px] flex-1">
          <h2 className="text-[15px] font-extrabold text-tl-ink">Payment not showing?</h2>
          <p className="mt-1 text-sm leading-normal text-tl-muted">
            If you have paid and it is not showing here, message the {child.school.name} bursary with your receipt number or transfer reference.
          </p>
        </div>
        <Link to="/messages?to=office" className={ghostButton}>
          Message the bursary
        </Link>
      </section>
    </div>
  );
}

/**
 * The Payments screen for the active child.
 *
 * @returns The page.
 */
export default function Payments() {
  return <ChildGate loadingLabel="Loading payments">{(child) => <ChildPayments key={child.id} child={child} />}</ChildGate>;
}
