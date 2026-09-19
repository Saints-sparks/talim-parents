import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ThemePreference } from '../../services/settings.services';
import { ModalShell } from '../profile/ModalShell';
import { THEME_OPTIONS } from './themeOptions';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '../profile/formControls';

/**
 * Picks light, dark or the device's setting.
 *
 * @param props - Component props.
 * @param props.currentTheme - The saved choice.
 * @param props.saving - A save is in flight.
 * @param props.onClose - Called when dismissed.
 * @param props.onSave - Called with the chosen theme.
 * @returns The dialog.
 */
export function ThemePreferenceModal({
  currentTheme,
  saving,
  onClose,
  onSave,
}: {
  currentTheme: ThemePreference;
  saving: boolean;
  onClose: () => void;
  onSave: (theme: ThemePreference) => void;
}) {
  const [selected, setSelected] = useState<ThemePreference>(currentTheme);

  return (
    <ModalShell title="Theme Preference" onClose={onClose}>
      <div className="px-6 py-5">
        <div role="radiogroup" aria-label="Theme" className="space-y-3">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(value)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-[#0A4EA3] bg-[#EEF6FF] dark:bg-blue-950/40'
                    : 'border-[#EEF2F7] hover:bg-[#F8FAFD] dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                    active ? 'bg-[#0A4EA3] text-white' : 'bg-[#F4F8FF] text-[#0A4EA3] dark:bg-slate-800 dark:text-blue-300'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[#101828] dark:text-slate-100">{label}</span>
                {active && <Check className="ml-auto h-4 w-4 text-[#0A4EA3] dark:text-blue-300" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave(selected)} disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? 'Saving...' : 'Save Preference'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
