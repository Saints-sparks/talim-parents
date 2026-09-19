import { Mail, ShieldCheck } from 'lucide-react';
import { mailtoHref } from '../../lib/support';

/**
 * Who to contact for the things a parent cannot change themselves.
 *
 * @param props - Component props.
 * @param props.schoolEmail - The school's own address; the Talim help address is used when absent.
 * @returns The card.
 */
export function AccountSupportCard({ schoolEmail }: { schoolEmail?: string | null }) {
  return (
    <section className="rounded-xl border border-[#E5EAF2] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-[#101828] dark:text-slate-100">Account Support</h2>
      <p className="mt-1 text-sm text-[#667085] dark:text-slate-400">
        Your school manages key account details.
      </p>

      <div className="mt-6 space-y-3">
        <div className="flex gap-3 rounded-lg bg-[#F4F8FF] p-4 dark:bg-slate-800/60">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#0A4EA3] dark:bg-slate-900 dark:text-blue-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#101828] dark:text-slate-100">School-managed profile</h3>
            <p className="mt-1 text-sm leading-5 text-[#667085] dark:text-slate-400">
              Contact your school administrator to correct your email or child links.
            </p>
          </div>
        </div>

        <a
          href={mailtoHref(schoolEmail)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#0A4EA3] hover:bg-[#F8FAFD] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Contact School Admin
        </a>
      </div>
    </section>
  );
}
