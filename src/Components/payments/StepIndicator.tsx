import { Fragment } from 'react';
import { Check } from 'lucide-react';

/** The three steps a parent walks before being handed to the provider. */
export const STEP_LABELS = ['Select Fees', 'Choose Provider', 'Review & Confirm'] as const;

/** How many steps the flow has before the provider takes over. */
export const TOTAL_STEPS = STEP_LABELS.length;

/**
 * The progress rail above the payment flow.
 *
 * @param props - Component props.
 * @param props.step - The 1-based step currently on screen.
 * @returns The indicator.
 */
export function StepIndicator({ step }: { step: number }) {
  return (
    <nav aria-label="Payment progress" className="mb-8 overflow-x-auto pb-1">
      <ol className="flex min-w-[320px] items-center gap-0">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const done = step > number;
          const active = step === number;
          return (
            <Fragment key={label}>
              <li
                className="flex min-w-[72px] flex-col items-center gap-1"
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    done || active
                      ? 'bg-[#003366] text-white dark:bg-blue-600'
                      : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500'
                  } ${active ? 'ring-4 ring-[#003366]/20 dark:ring-blue-500/25' : ''}`}
                >
                  {done ? <Check size={16} aria-hidden="true" /> : number}
                </span>
                <span
                  className={`whitespace-nowrap text-[10px] font-medium ${
                    active
                      ? 'text-[#003366] dark:text-blue-300'
                      : done
                        ? 'text-gray-600 dark:text-slate-300'
                        : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {label}
                </span>
                <span className="sr-only">
                  {done ? 'completed' : active ? 'current step' : 'not started'}
                </span>
              </li>
              {index < TOTAL_STEPS - 1 && (
                <li
                  aria-hidden="true"
                  className={`mb-5 h-0.5 flex-1 ${
                    done ? 'bg-[#003366] dark:bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
