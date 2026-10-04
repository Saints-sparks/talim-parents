import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useParentReceipts } from '../../../hooks/portal/usePortalPayments';
import { useActiveChild } from '../../../hooks/useActiveChild';
import { downloadReceiptsPdf, receiptFileName, studentLookup } from '../../../lib/receiptPdf';
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
 * The terms offered are the ones the child has receipts in (the receipts
 * list's `terms`, newest first).
 *
 * @param props - See {@link DownloadReceiptsSheetProps}.
 * @returns The sheet.
 */
export function DownloadReceiptsSheet({ open, onClose, child }: DownloadReceiptsSheetProps) {
  // Every receipt of the child, once: its `terms` are the terms that have receipts.
  const all = useParentReceipts(child.id, undefined, open);
  const { children } = useActiveChild();
  const studentOf = useMemo(() => studentLookup(children), [children]);
  const sessions = useMemo(() => [...new Set((all.data?.terms ?? []).map((term) => term.session ?? '—'))], [all.data]);
  const [session, setSession] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
    // Newest first: the latest term with receipts.
    const latest = all.data?.terms[0];
    setSession(latest ? (latest.session ?? '—') : null);
    setTermId(latest?.id ?? null);
  }, [open, all.data]);

  const termsOfSession = (all.data?.terms ?? []).filter((term) => (term.session ?? '—') === session);
  const term = termsOfSession.find((entry) => entry.id === termId) ?? null;
  const receipts = useParentReceipts(child.id, term?.id, open && Boolean(term));
  const firstName = firstNameOf(child.name);
  const downloadsOff = Boolean(receipts.data?.data.some((receipt) => !receipt.downloadAllowed));

  const download = async (): Promise<void> => {
    if (!term || !receipts.data) return;
    if (receipts.data.data.length === 0) {
      setError(`No receipts were issued for ${firstName} in ${term.name.toLowerCase()}, ${term.session}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await downloadReceiptsPdf(receipts.data.data, receiptFileName(child.name, term.name, term.session), studentOf);
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
              disabled={!term || busy || receipts.isPending || downloadsOff}
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
      ) : all.isPending ? (
        <div role="status" aria-label="Loading terms" className="h-24 animate-pulse rounded-2xl bg-tl-track" />
      ) : all.isError ? (
        <p role="alert" className="text-sm font-semibold text-tl-danger">{getErrorMessage(all.error, 'The terms could not be loaded.')}</p>
      ) : sessions.length === 0 ? (
        <p className="rounded-[14px] border border-tl-line-soft bg-tl-subtle p-3.5 text-[13px] leading-relaxed text-tl-muted">
          No receipts have been issued for {firstName} yet. Each payment produces one.
        </p>
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
            {downloadsOff ? ' The school has turned receipt downloads off; ask the bursary for a printed copy.' : ''}
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
