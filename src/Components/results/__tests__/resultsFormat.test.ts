import { describe, expect, it } from 'vitest';
import { buildResultsCsv, describePosition, formatFigure, ordinal, sumScores } from '../resultsFormat';
import type { ResultSummary, SubjectResult } from '../../../services/results.services';

/** A subject row, overridable per test. */
function subject(overrides: Partial<SubjectResult> = {}): SubjectResult {
  return {
    courseId: 'c1',
    subjectName: 'Mathematics',
    testScoreRaw: 24,
    testScoreWeighted: 24,
    examScoreRaw: 60,
    examScoreWeighted: 42,
    totalScore: 66,
    grade: 'C+',
    remark: 'Average',
    assessmentsCount: 3,
    cumulativeScore: 66,
    maxScore: 100,
    ...overrides,
  };
}

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [101, '101st'],
    [111, '111th'],
  ])('writes %i as %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });

  it('is an em dash when there is no position', () => {
    expect(ordinal(null)).toBe('—');
    expect(ordinal(undefined)).toBe('—');
    expect(ordinal(0)).toBe('—');
  });
});

describe('formatFigure', () => {
  it('formats to the requested decimals with a unit', () => {
    expect(formatFigure(66, 2, '%')).toBe('66.00%');
    expect(formatFigure(66.666, 1)).toBe('66.7');
  });

  it('keeps a real zero but not a missing value', () => {
    expect(formatFigure(0, 2, '%')).toBe('0.00%');
    expect(formatFigure(null)).toBe('—');
    expect(formatFigure(undefined)).toBe('—');
  });
});

describe('sumScores', () => {
  it('adds obtained and available score across subjects', () => {
    const totals = sumScores([subject({ cumulativeScore: 66, maxScore: 100 }), subject({ cumulativeScore: 40, maxScore: 50 })]);
    expect(totals).toEqual({ totalRaw: 106, totalMax: 150 });
  });

  it('is zero for nothing', () => {
    expect(sumScores(undefined)).toEqual({ totalRaw: 0, totalMax: 0 });
    expect(sumScores([])).toEqual({ totalRaw: 0, totalMax: 0 });
  });
});

describe('describePosition', () => {
  const base = { classPosition: 3, totalStudents: 30 } as ResultSummary;

  it('shows the ordinal, the class size and the percentile', () => {
    expect(describePosition(base)).toEqual({ value: '3rd / 30', sub: 'Top 10.0%' });
  });

  it('is empty until the class cumulative is published', () => {
    expect(describePosition({ ...base, classPosition: null })).toEqual({ value: '—', sub: null });
    expect(describePosition(undefined)).toEqual({ value: '—', sub: null });
  });

  it('does not invent a class size', () => {
    expect(describePosition({ ...base, totalStudents: null })).toEqual({ value: '3rd / ?', sub: null });
  });
});

describe('buildResultsCsv', () => {
  it('writes a header and one quoted row per subject', () => {
    const csv = buildResultsCsv([subject()]);
    expect(csv.split('\n')).toEqual([
      '"Subject","Test Score (30%)","Exam Score (70%)","Total Score (%)","Grade","Remark"',
      '"Mathematics","24","60","66.00","C+","Average"',
    ]);
  });

  it('shows an em dash where a score has not been recorded', () => {
    const csv = buildResultsCsv([subject({ testScoreRaw: null, examScoreRaw: null })]);
    expect(csv).toContain('"Mathematics","—","—"');
  });

  it('escapes quotes and defuses spreadsheet formulas typed by the school', () => {
    const csv = buildResultsCsv([subject({ subjectName: '=HYPERLINK("http://evil")', remark: 'Said "good"' })]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain('"Said ""good"""');
  });
});
