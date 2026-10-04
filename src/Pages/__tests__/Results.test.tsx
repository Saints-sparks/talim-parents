import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPortal, requestsTo } from '../../test-utils/portal';
import { userEvent } from '../../test-utils/render';
import { CHILDREN, TERMS } from '../../dev/fixtures/seed';
import { CHILD_HEADER } from '../../lib/apiClient';
import Results from '../Results';
import { gradeTone, reportPhase, scaleRanges } from '../../Components/portal/results/reportFormat';

vi.setConfig({ testTimeout: 20_000 });
const MUSA = CHILDREN[0];

describe('Results (fixtures)', () => {
  it('opens on the live term with the assessment columns from the API and no signing yet', async () => {
    const { fixtures } = renderPortal(<Results />);
    expect(await screen.findByText('Live term — scores update as teachers publish them.')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: /Scores by subject/ });
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Subject', '1st CA / 20', '2nd CA / 20', 'Exam / 60', 'Total', 'Grade', 'Position']);
    expect(within(table).getAllByRole('row')).toHaveLength(14);
    expect(screen.queryByRole('button', { name: 'Sign as parent' })).not.toBeInTheDocument();
    // One aggregate call per term instead of the old per-resource calls.
    expect(requestsTo(fixtures, '/report-card').map((r) => r.path)).toEqual([
      `/parents/me/children/${MUSA.id}/report-card/terms`,
      `/parents/me/children/${MUSA.id}/report-card`,
    ]);
  });

  it('signs an archived report (B8), then offers the download', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const { fixtures } = renderPortal(<Results />);
    await screen.findByText(/Live term/);

    await user.selectOptions(screen.getByLabelText('Academic session'), '2025 / 2026');
    expect(await screen.findByText('Archived report · closed 22 July 2026')).toBeInTheDocument();
    expect(await screen.findByText('1 September 2026')).toBeInTheDocument();
    expect(screen.getByText(/Musa has settled well/)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Sign as parent' }));
    expect(await screen.findByRole('button', { name: 'Download term report' })).toBeInTheDocument();
    expect(screen.getByText(/Acknowledged/)).toBeInTheDocument();
    const ack = requestsTo(fixtures, '/acknowledge');
    expect(ack).toHaveLength(1);
    expect(ack[0].body).toEqual({ termId: TERMS[3].id });
    expect(ack[0].headers[CHILD_HEADER]).toBe(MUSA.id);

    await user.click(screen.getByRole('button', { name: 'Download term report' }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('explains a term whose results are not published yet', async () => {
    const user = userEvent.setup();
    renderPortal(<Results />);
    await screen.findByText(/Live term/);
    await user.selectOptions(screen.getByLabelText('Term within the session'), TERMS[1].id);
    expect(await screen.findByText('Second term results have not been published yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign as parent|Download/ })).not.toBeInTheDocument();
  });

  it('opens on the term a link asks for', async () => {
    renderPortal(<Results />, { path: '/results', route: `/results?termId=${TERMS[3].id}` });
    expect(await screen.findByText(/Archived report/)).toBeInTheDocument();
  });

  it('shows the no-class state', async () => {
    renderPortal(<Results />, { scenario: 'no-class' });
    expect(await screen.findByText('Musa is not in a class yet')).toBeInTheDocument();
  });

  it('says there are no results yet when the school has no term (no report terms)', async () => {
    const { fixtures } = renderPortal(<Results />, { scenario: 'no-term' });
    expect(await screen.findByText('No results for Musa yet')).toBeInTheDocument();
    expect(requestsTo(fixtures, '/report-card').map((r) => r.path)).toEqual([`/parents/me/children/${MUSA.id}/report-card/terms`]);
  });
});

describe('report helpers', () => {
  it('names the phases: pending, live, published this term, archived', () => {
    const term = { id: 't', name: 'First term', session: '2026 / 2027', status: 'none' as const, isCurrent: true, startDate: '2026-09-01', endDate: '2026-12-15' };
    expect(reportPhase(term)).toBe('pending');
    expect(reportPhase({ ...term, status: 'partial' })).toBe('live');
    expect(reportPhase({ ...term, status: 'published' })).toBe('published');
    expect(reportPhase({ ...term, status: 'published', isCurrent: false })).toBe('archived');
  });

  it('turns the school scale ({ letter, min, remark }) into ranges, best first', () => {
    expect(scaleRanges([{ letter: 'A', min: 70, remark: 'Excellent' }, { letter: 'F', min: 0, remark: 'Fail' }, { letter: 'B', min: 60, remark: null }])).toEqual([
      { letter: 'A', range: '70 – 100%', remark: 'Excellent' },
      { letter: 'B', range: '60 – 69%', remark: '' },
      { letter: 'F', range: '0 – 59%', remark: 'Fail' },
    ]);
  });

  it('tones a grade by its place on the scale, whatever order the API sends it in', () => {
    const scale = [
      { letter: 'F', min: 0, remark: 'Fail' },
      { letter: 'A', min: 70, remark: 'Excellent' },
      { letter: 'C', min: 50, remark: 'Good' },
      { letter: 'B', min: 60, remark: 'Very good' },
    ];
    expect(gradeTone('A', scale)).toBe('success');
    expect(gradeTone('B', scale)).toBe('info');
    expect(gradeTone('C', scale)).toBe('warning');
    expect(gradeTone('F', scale)).toBe('danger');
    expect(gradeTone('Z', scale)).toBe('muted');
  });
});
