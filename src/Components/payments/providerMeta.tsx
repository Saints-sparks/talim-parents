import { Building2, CreditCard, Globe, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PaymentProviderName } from '../../types/payments';

/** How one payment provider is presented in the picker and on the review step. */
export interface ProviderMeta {
  name: string;
  tagline: string;
  icon: ReactNode;
  bg: string;
  border: string;
  selectedBorder: string;
}

const META: Record<PaymentProviderName, ProviderMeta> = {
  paystack: {
    name: 'Paystack',
    tagline: 'Cards, Bank Transfer, USSD',
    icon: <Building2 size={24} className="text-green-600 dark:text-green-400" aria-hidden="true" />,
    bg: 'bg-green-50 dark:bg-green-950/40',
    border: 'border-green-200 dark:border-green-900',
    selectedBorder: 'border-green-500 dark:border-green-400',
  },
  opay: {
    name: 'OPay',
    tagline: 'Wallet, Bank Transfer, Card',
    icon: <Smartphone size={24} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900',
    selectedBorder: 'border-blue-500 dark:border-blue-400',
  },
  stripe: {
    name: 'Stripe',
    tagline: 'Visa, Mastercard, Amex',
    icon: <Globe size={24} className="text-purple-600 dark:text-purple-400" aria-hidden="true" />,
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-900',
    selectedBorder: 'border-purple-500 dark:border-purple-400',
  },
};

/**
 * Presentation for a provider, falling back to a neutral card for one the
 * backend has enabled but this build does not know about yet — so a new
 * provider appears as a usable option rather than an unlabelled blank row.
 *
 * @param providerName - The provider's key as the API spells it.
 * @returns Its presentation.
 */
export function providerMeta(providerName: string): ProviderMeta {
  return (
    META[providerName as PaymentProviderName] ?? {
      name: providerName,
      tagline: 'Online payment',
      icon: <CreditCard size={24} className="text-gray-600 dark:text-slate-300" aria-hidden="true" />,
      bg: 'bg-gray-50 dark:bg-slate-800',
      border: 'border-gray-100 dark:border-slate-700',
      selectedBorder: 'border-[#003366] dark:border-blue-400',
    }
  );
}
