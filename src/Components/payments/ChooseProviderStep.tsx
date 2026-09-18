import { useState } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { usePaymentProviders } from '../../hooks/usePayments';
import { EmptyState, ErrorState, LoadingState } from '../StateComponents';
import { providerMeta } from './providerMeta';
import type { PaymentProviderName } from '../../types/payments';

/**
 * Step 2 — the parent picks who processes the payment.
 *
 * @param props - Component props.
 * @param props.onNext - Called with the chosen provider.
 * @param props.onBack - Returns to fee selection.
 * @returns The step.
 */
export function ChooseProviderStep({
  onNext,
  onBack,
}: {
  onNext: (provider: PaymentProviderName) => void;
  onBack: () => void;
}) {
  const { data: providers, isPending, isError, error, refetch } = usePaymentProviders();
  const [selected, setSelected] = useState<PaymentProviderName | null>(null);

  if (isPending) return <LoadingState count={3} label="Loading payment providers" />;
  if (isError) {
    return (
      <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load payment options" />
    );
  }

  if (providers.length === 0) {
    return (
      <EmptyState
        icon={<AlertCircle size={40} className="text-orange-400 dark:text-orange-500" aria-hidden="true" />}
        title="No payment providers available"
        message="Your school has not enabled online payments yet. Please contact the school office."
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
        Select how you&apos;d like to make this payment.
      </p>

      <fieldset className="space-y-3">
        <legend className="sr-only">Payment provider</legend>
        {providers.map((provider) => {
          const meta = providerMeta(provider.providerName);
          const isSelected = selected === provider.providerName;
          return (
            <label
              key={provider.providerName}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 transition-all dark:bg-slate-900 ${
                isSelected
                  ? `${meta.selectedBorder} shadow-sm`
                  : `${meta.border} hover:border-gray-200 dark:hover:border-slate-700`
              }`}
            >
              <input
                type="radio"
                name="payment-provider"
                value={provider.providerName}
                checked={isSelected}
                onChange={() => setSelected(provider.providerName)}
                className="sr-only"
              />
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                {meta.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-800 dark:text-slate-100">{meta.name}</span>
                <span className="mt-0.5 block text-xs text-gray-400 dark:text-slate-500">{meta.tagline}</span>
                {provider.environment === 'test' && (
                  <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Test mode — no real money moves
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected
                    ? 'border-[#003366] bg-[#003366] dark:border-blue-400 dark:bg-blue-500'
                    : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </label>
          );
        })}
      </fieldset>

      <p className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
        <Lock size={12} aria-hidden="true" />
        <span>All transactions are secured and encrypted</span>
      </p>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="flex-1 rounded-xl bg-[#003366] py-2.5 text-sm font-semibold text-white transition hover:bg-[#003366]/90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
