import { useState } from 'react';
import { APP_PLATFORM, APP_VERSION } from '../../../lib/appVersion';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, SUPPORT_URL, TERMS_OF_SERVICE_URL } from '../../../lib/support';
import { Sheet } from '../ui/Dialog';
import { primaryButton, textLink } from '../ui/styles';
import { LinkRow, ValueRow } from './rows';

/** One section of a legal page. */
interface Section {
  h: string;
  p: string;
}

/** The privacy policy, from the design (contact address and security line brought in line with the app). */
const PRIVACY: Section[] = [
  { h: 'What this policy covers', p: 'This policy explains what Talim collects when you use the parent portal, why we hold it, who can see it, and the choices you have. It applies to the Talim parent app and web portal operated for every school linked to your account.' },
  { h: 'Information we hold', p: "Account details you give us: your name, phone number, email address, home address and relationship to each child. School records supplied by the school: each child's class, registration number, attendance marks, scores, reports, fee invoices and payment receipts. Technical data created as you use the portal: device type, browser, sign-in times and the pages you open." },
  { h: 'Why we hold it', p: 'To show you your children’s records, to let the school reach you about attendance, results and fees, to process payments through our payment partners, and to keep the account secure. We do not use your data to build advertising profiles and we do not sell it.' },
  { h: 'Who can see your data', p: "Staff at the school your child attends see only that child's records and your contact details. Where you have children at more than one school, neither school sees the other's records. Talim support staff access an account only when you ask us to, or where we must to fix a fault, and that access is logged." },
  { h: 'Payments', p: 'Card and bank details are entered with our licensed payment partners (Paystack, OPay, Stripe) on their own pages and are held by them, not by Talim. We store the reference and amount of each transaction so receipts can be reissued.' },
  { h: 'How long we keep it', p: 'Academic records are kept for as long as the child is enrolled and for six years afterwards, as required of schools. Payment records are kept for seven years for tax and audit purposes. Sign-in logs are kept for twelve months. When you close an account we remove your contact details within thirty days.' },
  { h: 'Your rights', p: `You may ask for a copy of everything we hold about you, ask us to correct anything wrong, object to a particular use, or ask for deletion where the law allows it. Write to ${SUPPORT_EMAIL} and we will reply within thirty days. You may also complain to the Nigeria Data Protection Commission.` },
  { h: 'Security', p: 'Traffic is encrypted in transit, records are encrypted at rest, and staff access is role-based and audited. You can see and sign out the devices signed in to your account in Settings › Security.' },
  { h: 'Changes', p: 'If this policy changes in a way that affects you, we will tell you in the portal and by email at least fourteen days before it takes effect.' },
];

/** The terms of service, from the design. */
const TERMS: Section[] = [
  { h: 'Agreement', p: "By signing in to the Talim parent portal you accept these terms. Talim provides the software; your child's school owns and is responsible for the academic, attendance and financial records shown here." },
  { h: 'Your account', p: 'The account is personal to you. Keep your password private, do not share sign-in details with anyone, and tell the school office at once if you think someone else has access. You are responsible for what is done through your account.' },
  { h: 'Linking a child', p: 'A child is linked with a code issued by their school. Requesting a code for a child you are not the parent or legal guardian of is a misuse of the service and the school may remove the link at any time without notice.' },
  { h: 'Fees and payments', p: "Fee amounts, due dates and any discounts are set by the school, not by Talim. Payments are taken by licensed partners and a receipt is issued on success. Refunds, waivers and payment plans are matters for the school. Where a payment fails but funds leave your account, the partner's reversal timeline applies, usually within seven working days." },
  { h: 'Accuracy of records', p: 'Scores, marks and comments are entered by teachers and may be corrected before a term closes. A report is final once the school publishes it. If you believe a record is wrong, raise it with the class teacher or the school office first.' },
  { h: 'Acceptable use', p: "Do not use messaging to abuse, threaten or harass staff or other parents, do not attempt to access records that are not yours, and do not copy or republish another family's information. Accounts that break these rules can be suspended." },
  { h: 'Availability', p: 'We aim to keep the portal available at all times but maintenance and faults happen. Planned maintenance is announced in advance where possible.' },
  { h: 'Ending the agreement', p: 'You may stop using the portal at any time; the school may remove your access when your child leaves. Records already held remain subject to the retention periods set out in the privacy policy.' },
  { h: 'Contact', p: `Questions about these terms go to ${SUPPORT_EMAIL}. Questions about your child's records go to the school office.` },
];

/**
 * The About tab: the app and its version ("Version 1.5.0", read from
 * `package.json`), the privacy policy and terms (in-app, each linking its
 * full page on www.mytalim.com), and Talim's support page.
 *
 * @returns The panel.
 */
export function AboutPanel() {
  const [doc, setDoc] = useState<'privacy' | 'terms' | null>(null);
  const sections = doc === 'privacy' ? PRIVACY : TERMS;
  return (
    <div className="mt-[18px]">
      <ValueRow label={APP_PLATFORM} value={`Version ${APP_VERSION}`} />
      <LinkRow label="Privacy Policy" description="How your data is handled." onOpen={() => setDoc('privacy')} />
      <LinkRow label="Terms of Service" description="The rules for using the portal." onOpen={() => setDoc('terms')} />
      <LinkRow label="Support" description="Guides and how to reach Talim." href={SUPPORT_URL} />
      <Sheet
        open={doc !== null}
        onClose={() => setDoc(null)}
        eyebrowText="Talim"
        title={doc === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
        subtitle="Version 1.0"
        footer={
          <>
            <a href={doc === 'privacy' ? PRIVACY_POLICY_URL : TERMS_OF_SERVICE_URL} target="_blank" rel="noopener noreferrer" className={textLink}>
              Read the full policy
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <button type="button" className={`${primaryButton} flex-1`} onClick={() => setDoc(null)}>
              Close
            </button>
          </>
        }
      >
        {sections.map((section) => (
          <section key={section.h}>
            <h3 className="mb-1.5 text-[15px] font-extrabold tracking-[-0.2px] text-tl-ink">{section.h}</h3>
            <p className="text-sm leading-[1.7] text-tl-body">{section.p}</p>
          </section>
        ))}
      </Sheet>
    </div>
  );
}
