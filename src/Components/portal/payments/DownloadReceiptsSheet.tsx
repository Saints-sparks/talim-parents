import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useReportTerms } from '../../../hooks/portal/useChildData';
import { useParentReceipts } from '../../../hooks/portal/usePortalPayments';
import { downloadReceiptsPdf, receiptFileName } from '../../../lib/receiptPdf';
import { firstNameOf } from '../../../lib/format';
import { getErrorMessage } from '../../../lib/apiError';
import { Sheet } from '../ui/Dialog';
import { chip, ghostButton, primaryButton } from '../ui/styles';

/** Props for {@link DownloadReceiptsSheet}. */
export interface DownloadReceiptsSheetProps {
  open: boolean;
  onClose: () => void;
  child: { id: string; name: string };
}

/**
 * The design's "Download receipts" sheet: pick a session and a term, get one
 * PDF of every receipt issued for the child then (C5), built in the browser.
 * The term list is the child's terms (B5); CONTRACT GAP: there is no
 * per-child "terms with receipts" route, so a term may have none.
 *
 * @param props - See {@link DownloadReceiptsSheetProps}.
 * @returns The sheet.
 */
export function DownloadReceiptsSheet({ open, onClose, child }: DownloadReceiptsSheetProps) {
  const terms = useReportTerms(open ? child.id : undefined);
  const sessions = useMemo(() => [...new Set((terms.data ?? []).map((term) => term.session ?? '—'))], [terms.data]);
  const [session, setSession] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
    const current = terms.data?.find((term) => term.isCurrent) ?? terms.data?.[0];
    setSession(current?.session ?? null);
    setTermId(current?.id ?? null);
  }, [open, terms.data]);

  const termsOfSession = (terms.data ?? []).filter((term) => (term.session ?? '—') === session);
  const term = termsOfSession.find((entry) => entry.id === termId) ?? null;
  const receipts = useParentReceipts(child.id, term?.id, open && Boolean(term));
  const firstName = firstNameOf(child.name);

  const download = async (): Promise<void> => {
    if (!term || !receipts.data) return;
    if (receipts.data.data.length === 0) {
      setError(`No receipts were issued for ${firstName} in ${term.name.toLowerCase()}, ${term.session}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await downloadReceiptsPdf(receipts.data.data, receiptFileName(child.name, term.name, term.session));
      setDone(true);
    } catch (cause) {
      setError(getErrorMessage(cause, 'The PDF could not be made. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrowText="Receipts"
      title={done ? 'Receipts ready' : 'Download receipts'}
      subtitle={`Receipts are issued per term. Choose the session and term you need for ${child.name}.`}
      footer={
        done ? (
          <button type="button" className={`${primaryButton} flex-1`} onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className={ghostButton} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`${primaryButton} flex-1`}
              disabled={!term || busy || receipts.isPending || receipts.data?.allowParentDownload === false}
              onClick={() => void download()}
            >
              {busy ? 'Preparing PDF…' : 'Download PDF'}
            </button>
          </>
        )
      }
    >
      {done ? (
        <div role="status" className="flex items-start gap-3">
          <CheckCircle2 className="h-7 w-7 shrink-0 text-tl-success" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-tl-muted">
            {firstName} · {term?.name.toLowerCase()}, {term?.session}. The PDF has been saved to your downloads.
          </p>
        </div>
      ) : terms.isPending ? (
        <div role="status" aria-label="Loading terms" className="h-24 animate-pulse rounded-2xl bg-tl-track" />
      ) : terms.isError ? (
        <p role="alert" className="text-sm font-semibold text-tl-danger">{getErrorMessage(terms.error, 'The terms could not be loaded.')}</p>
      ) : (
        <>
          <fieldset>
            <legend className="mb-2.5 text-[13px] font-extrabold text-tl-muted">Session</legend>
            <div className="flex flex-wrap gap-2.5">
              {sessions.map((entry) => (
                <button key={entry} type="button" aria-pressed={entry === session} className={chip(entry === session)} onClick={() => { setSession(entry); setTermId(null); }}>
                  {entry}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2.5 text-[13px] font-extrabold text-tl-muted">Term</legend>
            <div className="flex flex-wrap gap-2.5">
              {termsOfSession.map((entry) => (
                <button key={entry.id} type="button" aria-pressed={entry.id === term?.id} className={chip(entry.id === term?.id)} onClick={() => setTermId(entry.id)}>
                  {entry.name}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="rounded-[14px] border border-tl-line-soft bg-tl-subtle p-3.5 text-[13px] leading-relaxed text-tl-muted">
            {term
              ? `One PDF containing every receipt issued to this account for ${firstName} in ${term.name.toLowerCase()}, ${term.session}.`
              : 'Choose a term.'}
            {receipts.data?.allowParentDownload === false ? ' The school has turned receipt downloads off; ask the bursary for a printed copy.' : ''}
          </p>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-tl-danger">
              {error}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
