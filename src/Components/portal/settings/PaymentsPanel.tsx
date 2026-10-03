import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { useChildProviders } from '../../../hooks/portal/usePortalPayments';
import { useSetPreferredMethod } from '../../../hooks/portal/useAccount';
import { useParentSettings } from '../../../hooks/useParentSettings';
import { getErrorMessage } from '../../../lib/apiError';
import { DownloadReceiptsSheet } from '../payments/DownloadReceiptsSheet';
import { payMethods } from '../payments/methods';
import { chip, textLink } from '../ui/styles';
import { LinkRow, ValueRow } from './rows';

/**
 * The Payments tab: the method offered first at checkout (C7), where receipts
 * go, and one PDF of a term's receipts. There is no saved card: cards are
 * only entered on the provider's page.
 *
 * @returns The panel.
 */
export function PaymentsPanel() {
  const { child } = useActiveChild();
  const settings = useParentSettings();
  const providers = useChildProviders(child?.id);
  const save = useSetPreferredMethod();
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const methods = useMemo(() => payMethods(providers.data ?? []), [providers.data]);
  const preferred = save.isPending ? save.variables : (settings.data?.preferences.preferredProvider ?? null);

  return (
    <div className="mt-[18px]">
      <fieldset className="border-t border-tl-line-soft py-4">
        <legend className="sr-only">Method offered first at checkout</legend>
        <div className="text-[15px] font-bold text-tl-ink" aria-hidden="true">
          Method offered first at checkout
        </div>
        <p className="mt-[3px] text-sm text-tl-muted">Talim never stores your card details; cards are entered on the provider&apos;s secure page.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {methods.map((method) => (
            <button key={method.id} type="button" aria-pressed={preferred === method.id} className={chip(preferred === method.id)} onClick={() => save.mutate(method.id)}>
              {method.name}
            </button>
          ))}
        </div>
        {save.isError ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-tl-danger">
            {getErrorMessage(save.error, 'Your preference could not be saved.')}
          </p>
        ) : null}
      </fieldset>
      <ValueRow label="Receipts sent to" value={settings.data?.profile.email ?? '—'} />
      {child ? (
        <LinkRow label="Download all receipts" description={`Choose a session and term, get one PDF for ${child.name}.`} onOpen={() => setReceiptsOpen(true)} />
      ) : null}
      <div className="border-t border-tl-line-soft pt-4">
        <Link to="/payments" className={textLink}>
          Open Payments →
        </Link>
      </div>
      {child ? <DownloadReceiptsSheet open={receiptsOpen} onClose={() => setReceiptsOpen(false)} child={{ id: child.id, name: child.name }} /> : null}
    </div>
  );
}
