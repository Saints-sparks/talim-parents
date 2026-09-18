import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Phone, Receipt as ReceiptIcon, Wallet, type LucideIcon } from 'lucide-react';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import { useSchool } from '../hooks/useSchool';
import {
  useDueFees,
  usePaymentHistory,
  usePaymentProviders,
  usePaymentSummary,
  useReceipts,
} from '../hooks/usePayments';
import { DueFeesTab } from '../Components/payments/DueFeesTab';
import { PaymentHistoryTab } from '../Components/payments/PaymentHistoryTab';
import { ReceiptsTab } from '../Components/payments/ReceiptsTab';
import { ReceiptModal } from '../Components/payments/ReceiptModal';
import { providerMeta } from '../Components/payments/providerMeta';
import { computePaymentTotals, formatNaira } from '../lib/paymentTotals';
import { childFullName, childRecordId } from '../types/parent';
import ChildSwitcher from '../Components/parent/ChildSwitcher';
import type { Receipt } from '../types/payments';

/** Rows fetched per page for history and receipts. */
const PAGE_SIZE = 10;

const TABS = ['Due Fees', 'Paid History', 'Receipts', 'Payment Methods'] as const;
type Tab = (typeof TABS)[number];

/**
 * One summary stat card.
 *
 * @param props - Component props.
 * @param props.label - What the number means.
 * @param props.value - The number to show.
 * @param props.actionLabel - Text for the jump-to-tab link.
 * @param props.icon - Icon component.
 * @param props.tone - Text colour for the value.
 * @param props.onClick - Switches to the related tab.
 * @returns The card.
 */
function StatCard({
  label,
  value,
  actionLabel,
  icon: Icon,
  tone = 'text-[#003366] dark:text-blue-300',
  onClick,
}: {
  label: string;
  value: string;
  actionLabel?: string;
  icon: LucideIcon;
  tone?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8EDF3] dark:bg-slate-800">
        <Icon size={20} className="text-[#003366] dark:text-blue-300" />
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold ${tone}`}>{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-slate-400">{label}</p>
        {actionLabel && onClick && (
          <button
            type="button"
            onClick={onClick}
            className="mt-1 text-xs text-[#003366] hover:underline dark:text-blue-300"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A read-only summary of which providers the school has enabled — the old
 * page hardcoded three providers as always "Available" regardless of what the
 * school had actually turned on; this reads the same list MakePayment does.
 *
 * @returns The tab.
 */
function PaymentMethodsTab() {
  const { data: providers, isPending, isError } = usePaymentProviders();

  if (isPending) {
    return <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />;
  }
  if (isError || !providers || providers.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <AlertCircle size={40} className="mx-auto mb-3 text-orange-400 dark:text-orange-500" aria-hidden="true" />
        <p className="font-semibold text-gray-700 dark:text-slate-200">No payment providers available</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
          Your school has not enabled online payments yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Your school accepts payment through the providers below.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {providers.map((provider) => {
          const meta = providerMeta(provider.providerName);
          return (
            <div
              key={provider.providerName}
              className={`rounded-2xl border-2 p-5 ${meta.border} ${meta.bg}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-900/40">
                  {meta.icon}
                </span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-slate-100">{meta.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{meta.tagline}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">Available</span>
                {provider.environment === 'test' && (
                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Test mode
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">Secure payments</p>
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-300">
            We do not store card details. Every transaction is processed by the provider you choose.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Outstanding fees, payment history and receipts for the child the parent is
 * looking at.
 *
 * @returns The page.
 */
export default function Payments() {
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();
  const { wards } = useParentOnboarding();
  const { data: school } = useSchool();

  const [activeTab, setActiveTab] = useState<Tab>('Due Fees');
  const [historyPage, setHistoryPage] = useState(1);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);

  const studentId = childRecordId(selectedStudent);

  const dueFees = useDueFees(studentId);
  const summary = usePaymentSummary();
  const history = usePaymentHistory({ studentId, page: historyPage, limit: PAGE_SIZE });
  const receipts = useReceipts({ studentId, page: receiptsPage, limit: PAGE_SIZE });

  const fees = useMemo(() => dueFees.data ?? [], [dueFees.data]);
  const totals = useMemo(() => computePaymentTotals(fees), [fees]);
  const overdueAmount = useMemo(
    () => computePaymentTotals(fees.filter((f) => f.isOverdue)).total,
    [fees],
  );

  return (
    <div className="min-h-screen bg-gray-50 font-manrope dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div
          data-guide="payments-header"
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Payments</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              View outstanding fees, make payments and manage receipts.
            </p>
          </div>
          {wards.length > 1 && (
            <ChildSwitcher
              children={wards}
              selectedChild={selectedStudent}
              onChange={(child) => child && updateSelectedStudent(child)}
            />
          )}
        </div>

        {!studentId ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <Wallet size={40} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" aria-hidden="true" />
            <p className="font-semibold text-gray-700 dark:text-slate-200">No child selected</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
              Choose a child to see their fees and payment history.
            </p>
          </div>
        ) : (
          <>
            <div data-guide="payments-summary" className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="Outstanding for this child"
                value={formatNaira(totals.total)}
                actionLabel="View due fees"
                icon={Wallet}
                onClick={() => setActiveTab('Due Fees')}
              />
              <StatCard
                label="Total paid"
                value={formatNaira(summary.data?.totalPaid ?? 0)}
                actionLabel="View history"
                icon={CheckCircle}
                tone="text-green-600 dark:text-green-400"
                onClick={() => setActiveTab('Paid History')}
              />
              <StatCard
                label="Total receipts"
                value={String(summary.data?.totalReceipts ?? '—')}
                actionLabel="View receipts"
                icon={ReceiptIcon}
                onClick={() => setActiveTab('Receipts')}
              />
              <StatCard
                label="Overdue amount"
                value={formatNaira(overdueAmount)}
                icon={AlertCircle}
                tone={overdueAmount > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-slate-400'}
              />
            </div>

            <div
              data-guide="payments-child"
              className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">Paying for</p>
              <div className="flex w-fit items-center gap-3 rounded-xl border-2 border-[#003366] bg-[#003366]/5 p-3 dark:border-blue-500 dark:bg-blue-950/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-400 text-sm font-bold text-white">
                  {(selectedStudent?.firstName?.[0] ?? 'S').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {childFullName(selectedStudent)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{selectedStudent?.className}</p>
                </div>
                <div className="ml-2">
                  <p className="text-xs text-gray-400 dark:text-slate-500">Outstanding</p>
                  <p className="text-sm font-bold text-[#003366] dark:text-blue-300">
                    {formatNaira(totals.total)}
                  </p>
                </div>
              </div>
            </div>

            <div data-guide="payments-tabs" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-slate-800">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-current={activeTab === tab ? 'page' : undefined}
                  className={`relative whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-[#003366] text-[#003366] dark:border-blue-400 dark:text-blue-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                  {tab === 'Due Fees' && fees.length > 0 && (
                    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {fees.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div data-guide="payments-content">
              {activeTab === 'Due Fees' && (
                <DueFeesTab
                  fees={fees}
                  isPending={dueFees.isPending}
                  isError={dueFees.isError}
                  error={dueFees.error}
                  onRetry={() => void dueFees.refetch()}
                  studentId={studentId}
                />
              )}
              {activeTab === 'Paid History' && (
                <PaymentHistoryTab
                  history={history.data}
                  isPending={history.isPending}
                  isError={history.isError}
                  error={history.error}
                  onRetry={() => void history.refetch()}
                  page={historyPage}
                  pageSize={PAGE_SIZE}
                  onPageChange={setHistoryPage}
                />
              )}
              {activeTab === 'Receipts' && (
                <ReceiptsTab
                  receipts={receipts.data}
                  isPending={receipts.isPending}
                  isError={receipts.isError}
                  error={receipts.error}
                  onRetry={() => void receipts.refetch()}
                  onView={setViewReceipt}
                  page={receiptsPage}
                  pageSize={PAGE_SIZE}
                  onPageChange={setReceiptsPage}
                />
              )}
              {activeTab === 'Payment Methods' && <PaymentMethodsTab />}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-blue-400 dark:text-blue-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Having issues with your payment?
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                If you have made a payment and it is not reflected, contact the school bursary or support team.
              </p>
            </div>
          </div>
          <a
            href={school?.phoneNumber ? `tel:${school.phoneNumber}` : school?.email ? `mailto:${school.email}` : undefined}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#003366]/30 px-3 py-2 text-sm text-[#003366] hover:bg-[#003366]/5 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            <Phone size={14} aria-hidden="true" /> Contact support
          </a>
        </div>
      </div>

      <ReceiptModal receipt={viewReceipt} school={school} onClose={() => setViewReceipt(null)} />
    </div>
  );
}
