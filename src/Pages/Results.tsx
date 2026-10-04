import { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../services/auth.services';
import { useAcknowledgeReport, useReportCard, useReportTerms } from '../hooks/portal/useChildData';
import { ChildGate } from '../Components/portal/ChildGate';
import { ReportSheet } from '../Components/portal/results/ReportSheet';
import { gradeTone, positionText, reportPhase, type ReportPhase } from '../Components/portal/results/reportFormat';
import { EmptyCard, ErrorCard, LoadingCard, PageHeader, Pill } from '../Components/portal/ui/primitives';
import { card, fieldControl, primaryButton, type Tone } from '../Components/portal/ui/styles';
import { getErrorMessage } from '../lib/apiError';
import { firstNameOf, longDate, ordinal, percent } from '../lib/format';
import type { ChildSummary } from '../types/portal/children';

/** The note beside the term picker. */
const PHASE_NOTE: Record<ReportPhase, { tone: Tone; text: (closed: string | null) => string }> = {
  pending: { tone: 'warning', text: () => 'Not yet published' },
  live: { tone: 'success', text: () => 'Live term — scores update as teachers publish them.' },
  published: { tone: 'success', text: () => 'Published' },
  archived: { tone: 'muted', text: (closed) => (closed ? `Archived report · closed ${longDate(closed)}` : 'Archived report') },
};

/**
 * Results for one child (B5): the term picker, the summary tiles and the
 * report sheet; "Sign as parent" (B8, once the term is published) and then
 * "Download term report" (the print dialog, which saves a PDF).
 *
 * @param props - The child.
 * @param props.child - The active child.
 * @returns The screen.
 */
function ChildResults({ child }: { child: ChildSummary }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const terms = useReportTerms(child.id);
  const [termId, setTermId] = useState<string | undefined>(undefined);
  const report = useReportCard(child.id, termId);
  const acknowledge = useAcknowledgeReport(child.id);
  const sessionId = useId();
  const termSelectId = useId();
  const firstName = firstNameOf(child.name);
  const parentName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Parent';

  // Open on the term a link asked for, else the current term, else the newest.
  useEffect(() => {
    if (termId || !terms.data?.length) return;
    const wanted = params.get('termId');
    const pick = terms.data.find((term) => term.id === wanted) ?? terms.data.find((term) => term.isCurrent) ?? terms.data[0];
    setTermId(pick.id);
  }, [terms.data, termId, params]);

  const sessions = useMemo(() => [...new Set((terms.data ?? []).map((term) => term.session ?? '—'))], [terms.data]);
  const selected = terms.data?.find((term) => term.id === termId);
  const session = selected?.session ?? '—';
  const sessionTerms = (terms.data ?? []).filter((term) => (term.session ?? '—') === session);
  const data = report.data;
  // With one subject scored the API names it both strongest and weakest; it is not "needs attention" then.
  const weakest = data?.weakest && data.weakest.courseId !== data.strongest?.courseId ? data.weakest : null;
  const phase = reportPhase(selected, data);
  const note = PHASE_NOTE[phase];
  const signed = Boolean(data?.acknowledgedAt);
  const periodLabel = selected ? `${selected.name.toLowerCase()}, ${selected.session ?? ''}` : '';

  const action =
    data && phase !== 'pending' && phase !== 'live' ? (
      signed ? (
        <button type="button" className={primaryButton} onClick={() => window.print()} title="Save or print this report as a PDF">
          Download term report
        </button>
      ) : (
        <button
          type="button"
          className={primaryButton}
          disabled={acknowledge.isPending}
          onClick={() => termId && acknowledge.mutate(termId)}
          title="Sign to acknowledge the report — the download unlocks once you have signed"
        >
          {acknowledge.isPending ? 'Signing…' : 'Sign as parent'}
        </button>
      )
    ) : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Results" subtitle={[child.name, periodLabel, child.class?.name].filter(Boolean).join(' · ')} actions={action} />

      {acknowledge.isError ? (
        <p role="alert" className="rounded-xl bg-tl-danger-bg px-4 py-3 text-sm font-semibold text-tl-danger" data-print-hide="1">
          {getErrorMessage(acknowledge.error, 'The report could not be signed. Please try again.')}
        </p>
      ) : null}
      {acknowledge.isSuccess ? (
        <p role="status" className="rounded-xl bg-tl-success-bg px-4 py-3 text-sm font-semibold text-tl-success" data-print-hide="1">
          Signed. The school can see you have read {firstName}&apos;s report, and you can now download it.
        </p>
      ) : null}

      {terms.isPending ? <LoadingCard rows={2} label="Loading terms" /> : null}
      {terms.isError ? <ErrorCard error={terms.error} title="The terms couldn't be loaded" onRetry={() => void terms.refetch()} /> : null}
      {terms.data && terms.data.length === 0 ? (
        <EmptyCard title={`No results for ${firstName} yet`} message="Reports appear here once the school has recorded scores for a term." />
      ) : null}

      {terms.data && terms.data.length > 0 ? (
        <div
          data-print-hide="1"
          className="flex flex-wrap items-center gap-3.5 rounded-[20px] border border-tl-line bg-tl-surface px-[18px] py-3.5 shadow-[0_1px_2px_rgba(15,27,46,0.04)]"
          title="Results are kept per term. Switching here changes only this page."
        >
          <span className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">Viewing</span>
          <label htmlFor={sessionId} className="sr-only">
            Academic session
          </label>
          <select
            id={sessionId}
            className={`${fieldControl} !w-auto cursor-pointer !text-sm`}
            value={session}
            onChange={(event) => {
              const first = terms.data.find((term) => (term.session ?? '—') === event.target.value);
              if (first) setTermId(first.id);
            }}
          >
            {sessions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <label htmlFor={termSelectId} className="sr-only">
            Term within the session
          </label>
          <select id={termSelectId} className={`${fieldControl} !w-auto cursor-pointer !text-sm`} value={termId ?? ''} onChange={(event) => setTermId(event.target.value)}>
            {sessionTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
          <Pill tone={note.tone}>{note.text(selected?.endDate ?? data?.term.endDate ?? null)}</Pill>
        </div>
      ) : null}

      {termId && report.isPending ? <LoadingCard rows={6} label="Loading the report" /> : null}
      {report.isError ? <ErrorCard error={report.error} title="The report couldn't be loaded" onRetry={() => void report.refetch()} /> : null}

      {data && phase === 'pending' ? (
        <div className={`${card} text-center`}>
          <div aria-hidden="true" className="mx-auto flex h-[54px] w-[54px] items-center justify-center rounded-full bg-tl-track text-2xl font-extrabold text-tl-muted">
            ·
          </div>
          <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink">{selected?.name} results have not been published yet</h2>
          <p className="mx-auto mt-2 max-w-[460px] text-sm leading-relaxed text-tl-muted">
            {selected?.name} of the {selected?.session} session has not been marked. Reports are published at the end of each term, and you
            will be notified as soon as {firstName}&apos;s is ready. Earlier terms are available from the picker above.
          </p>
        </div>
      ) : null}

      {data && phase !== 'pending' ? (
        <>
          {phase === 'live' ? (
            <p className="rounded-xl border border-tl-line bg-tl-surface px-4 py-3 text-sm text-tl-muted" data-print-hide="1">
              Some scores are still being published. You can sign the report once the school publishes the term&apos;s results.
            </p>
          ) : null}
          <div data-print-hide="1" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
            <SummaryTile label="Term average" value={percent(data.overall.percent)} pill={data.overall.grade ?? '—'} tone={gradeTone(data.overall.grade, data.scale)} note={`Across all ${data.rows.length} subjects`} />
            <SummaryTile
              label="Class position"
              value={data.overall.position ? ordinal(data.overall.position.rank) : '—'}
              pill={data.overall.position ? `of ${data.overall.position.of}` : 'Not ranked'}
              tone="muted"
              note={
                data.overall.position && data.overall.previousPosition
                  ? data.overall.previousPosition.rank === data.overall.position.rank
                    ? 'Same place as last term'
                    : `${data.overall.previousPosition.rank > data.overall.position.rank ? 'Up' : 'Down'} ${Math.abs(data.overall.previousPosition.rank - data.overall.position.rank)} from last term`
                  : 'No earlier term to compare'
              }
            />
            <SummaryTile
              label="Strongest subject"
              value={data.strongest ? data.strongest.short || data.strongest.title : '—'}
              pill={data.strongest ? percent(data.strongest.percent) : '—'}
              tone="success"
              note={data.strongest?.position ? `${positionText(data.strongest.position).replace(' of ', ' in class of ')}` : ' '}
            />
            <SummaryTile
              label="Needs attention"
              value={weakest ? weakest.short || weakest.title : '—'}
              pill={weakest ? percent(weakest.percent) : '—'}
              tone={weakest && weakest.percent < data.passMark ? 'danger' : 'warning'}
              note={!weakest ? 'Needs more than one subject scored' : weakest.percent < data.passMark ? `Below the pass mark of ${data.passMark}%` : 'Below the term average'}
            />
          </div>
          <ReportSheet report={data} parentName={parentName} />
        </>
      ) : null}
    </div>
  );
}

/**
 * One summary tile above the report.
 *
 * @param props - The tile's content.
 * @param props.label - What it measures.
 * @param props.value - The headline.
 * @param props.pill - The pill beside it.
 * @param props.tone - The pill's tone.
 * @param props.note - The line under it.
 * @returns The tile.
 */
function SummaryTile({ label, value, pill, tone, note }: { label: string; value: string; pill: string; tone: Tone; note: string }) {
  return (
    <div className="rounded-[20px] border border-tl-line bg-tl-surface p-5 shadow-[0_1px_2px_rgba(15,27,46,0.04)]">
      <div className="text-[13px] font-bold text-tl-muted">{label}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-[9px]">
        <div className="text-[clamp(23px,3vw,29px)] font-extrabold tracking-[-0.6px] text-tl-ink">{value}</div>
        <Pill tone={tone}>{pill}</Pill>
      </div>
      <div className="mt-1 text-[13px] text-tl-faint">{note}</div>
    </div>
  );
}

/**
 * The Results screen for the active child.
 *
 * @returns The page.
 */
export default function Results() {
  return (
    <ChildGate needsClass="results" loadingLabel="Loading results">
      {(child) => <ChildResults key={child.id} child={child} />}
    </ChildGate>
  );
}
