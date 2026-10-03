import type { PaymentProvider } from '../../../types/payments';
import type { PreferredMethod } from '../../../types/portal/payments';

/** One way to pay, as the checkout and the Methods tab list it. */
export interface PayMethod {
  id: PreferredMethod;
  name: string;
  /** What it takes. */
  desc: string;
  /** The channels, for the Methods tab. */
  channels: string;
  /** True when the provider runs in test mode (no real money). */
  testMode: boolean;
}

const PROVIDER_COPY: Record<string, { name: string; desc: string; channels: string }> = {
  paystack: { name: 'Paystack', desc: 'Card, bank transfer or USSD', channels: 'Visa, Mastercard, Verve · USSD' },
  opay: { name: 'OPay', desc: 'OPay wallet or transfer', channels: 'OPay wallet · Bank transfer' },
  stripe: { name: 'Stripe', desc: 'International card', channels: 'Credit and debit cards' },
};

/** Bank transfer, which the bursary confirms by hand (C4). */
export const BANK_TRANSFER: PayMethod = {
  id: 'bank_transfer',
  name: 'Bank transfer',
  desc: 'Pay into the school account',
  channels: 'Allow one working day for the bursary to confirm',
  testMode: false,
};

/**
 * The ways to pay at the child's school: its enabled providers (each a hosted
 * checkout; no card form here) and bank transfer, the parent's preferred one
 * first (C7).
 *
 * @param providers - The providers the school has enabled.
 * @param preferred - The parent's preferred method, if set.
 * @returns The methods, in the order to offer them.
 */
export function payMethods(providers: readonly PaymentProvider[], preferred?: PreferredMethod | null): PayMethod[] {
  const list: PayMethod[] = providers.map((provider) => {
    const copy = PROVIDER_COPY[provider.providerName] ?? { name: provider.providerName, desc: 'Online payment', channels: 'Online payment' };
    return { id: provider.providerName, ...copy, testMode: provider.environment === 'test' };
  });
  list.push(BANK_TRANSFER);
  const index = preferred ? list.findIndex((method) => method.id === preferred) : -1;
  if (index > 0) list.unshift(...list.splice(index, 1));
  return list;
}
