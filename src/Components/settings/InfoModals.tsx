import { SUPPORT_EMAIL } from '../../lib/support';
import { ModalShell } from '../profile/ModalShell';

/** The app version shown to parents in "About". */
const APP_VERSION = '2.0.0';

const PANEL =
  'rounded-xl border border-[#EEF2F7] bg-[#F8FAFD] p-4 dark:border-slate-800 dark:bg-slate-800/60';

/**
 * How to reach the school and Talim support. Static content, not a form.
 *
 * @param props - Component props.
 * @param props.onClose - Called when dismissed.
 * @returns The dialog.
 */
export function HelpSupportModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Help & Support" onClose={onClose}>
      <div className="space-y-4 px-6 py-5">
        <div className={PANEL}>
          <p className="text-sm font-bold text-[#101828] dark:text-slate-100">School Support</p>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
            For issues related to your child&apos;s records, attendance, or grades, contact your school
            administrator directly.
          </p>
        </div>
        <div className={PANEL}>
          <p className="text-sm font-bold text-[#101828] dark:text-slate-100">Talim Support</p>
          <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
            For app-related issues or account questions, reach out via:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-2 inline-block text-sm font-semibold text-[#0A4EA3] hover:underline dark:text-blue-300"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-full rounded-lg bg-[#0A4EA3] text-sm font-bold text-white hover:bg-[#083D82]"
        >
          Got it
        </button>
      </div>
    </ModalShell>
  );
}

/**
 * The app's name, version and support address.
 *
 * @param props - Component props.
 * @param props.onClose - Called when dismissed.
 * @returns The dialog.
 */
export function AboutTalimModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['Version', APP_VERSION],
    ['Platform', 'Parent Portal'],
    ['Support', SUPPORT_EMAIL],
  ];
  return (
    <ModalShell title="About Talim" onClose={onClose}>
      <div className="space-y-4 px-6 py-5">
        <div className="flex flex-col items-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#003366] text-2xl font-black text-white shadow-md">
            T
          </div>
          <h3 className="mt-3 text-xl font-black text-[#101828] dark:text-slate-100">Talim</h3>
          <p className="text-sm text-[#667085] dark:text-slate-400">School Management Platform</p>
        </div>

        <dl className="divide-y divide-[#EEF2F7] rounded-xl border border-[#EEF2F7] dark:divide-slate-800 dark:border-slate-800">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm font-medium text-[#667085] dark:text-slate-400">{label}</dt>
              <dd className="text-sm font-bold text-[#101828] dark:text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-center text-xs text-[#98A2B3] dark:text-slate-500">
          © {new Date().getFullYear()} Talim. All rights reserved.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-full rounded-lg border border-[#DCE5F2] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}
