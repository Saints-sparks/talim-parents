import { cn } from '../../lib/utils';

/**
 * An accessible on/off switch.
 *
 * @param props - Component props.
 * @param props.checked - Whether it is on.
 * @param props.onChange - Called with the new state.
 * @param props.label - The accessible name.
 * @param props.disabled - Blocks interaction.
 * @returns The switch.
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-[#0A4EA3]' : 'bg-[#D0D5DD] dark:bg-slate-600',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
