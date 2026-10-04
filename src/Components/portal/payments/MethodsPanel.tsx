import { useMemo } from 'react';
import { useBankDetails, useChildProviders } from '../../../hooks/portal/usePortalPayments';
import { useParentSettings } from '../../../hooks/useParentSettings';
import { useSetPreferredMethod } from '../../../hooks/portal/useAccount';
import { getErrorMessage } from '../../../lib/apiError';
import { Pill } from '../ui/primitives';
import { focusRing } from '../ui/styles';
import { payMethods } from './methods';

/**
 * The Payment methods tab: the ways to pay at the child's school, and which
 * one the parent wants offered first at checkout (C7). There is no "add a
 * card": cards are only ever entered on the provider's page.
 *
 * @param props - The child.
 * @param props.childId - The active child (decides the school).
 * @param props.schoolName - The school, for the bank transfer line.
 * @returns The panel.
 */
export function MethodsPanel({ childId, schoolName }: { childId: string; schoolName: string }) {
  const providers = useChildProviders(childId);
  const bank = useBankDetails(childId);
  const settings = useParentSettings();
  const save = useSetPreferredMethod();
  const preferred = save.isPending ? save.variables : (settings.data?.preferences.preferredProvider ?? null);
  const methods = useMemo(() => payMethods(providers.data ?? []), [providers.data]);

  return (
    <div>
      <p className="mt-[18px] text-sm text-tl-muted">Pick the method you want offered first at checkout. Talim never stores your card details.</p>
      {providers.isError ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-tl-danger">
          {getErrorMessage(providers.error, 'The online payment options could not be loaded.')}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3.5" role="radiogroup" aria-label="Preferred payment method">
        {methods.map((method) => {
          const on = preferred === method.id;
          const channels =
            method.id === 'bank_transfer'
              ? bank.data
                ? `${bank.data.accountName} · ${bank.data.accountNumber} · ${bank.data.bankName}`
                : `Into ${schoolName}'s account`
              : method.channels;
          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => save.mutate(method.id)}
              className={`rounded-[20px] border bg-tl-surface p-5 text-left transition-colors hover:border-tl-control ${on ? 'border-tl-brand' : 'border-tl-line'} ${focusRing}`}
            >
              <span className="flex items-center justify-between gap-2.5">
                <span className="text-base font-extrabold text-tl-ink">{method.name}</span>
                <span className={`text-[13px] font-extrabold ${on ? 'text-tl-success' : 'text-tl-faint'}`}>{on ? 'Preferred' : 'Set as preferred'}</span>
              </span>
              <span className="mt-[5px] block text-[13px] text-tl-muted">{method.desc}</span>
              <span className="mt-2.5 block text-[13px] leading-normal text-tl-faint">{channels}</span>
              {method.testMode ? <Pill tone="warning" className="mt-3">Test mode: no real money moves</Pill> : null}
            </button>
          );
        })}
      </div>
      {save.isError ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-tl-danger">
          {getErrorMessage(save.error, 'Your preference could not be saved.')}
        </p>
      ) : null}
    </div>
  );
}
