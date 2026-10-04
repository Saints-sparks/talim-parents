import { afterEach, describe, expect, it } from 'vitest';
import { installFixtures, type FixtureScenario, type InstalledFixtures } from '../../dev/fixtures';
import { sessionStore } from '../../lib/session';
import { CHILD_HEADER } from '../../lib/apiClient';
import { getChildren } from '../../services/portal/children';
import { CHILD_CHECKS, CHILD_SUMMARY, DASHBOARD, FAMILY_CHECKS, childHeaderMismatches } from '../screenContract';
import { arrayOf, checkShape, nullable, oneOf, optional, shape } from '../shape';

let fixtures: InstalledFixtures | null = null;

afterEach(() => {
  fixtures?.uninstall();
  fixtures = null;
});

/**
 * Serves one fixture family to the app's services, signed in.
 *
 * @param scenario - The family.
 * @returns The installed fixtures.
 */
function serve(scenario: FixtureScenario): InstalledFixtures {
  fixtures = installFixtures({ scenario });
  sessionStore.setToken('fixture-access-token');
  return fixtures;
}

describe('shape rules', () => {
  it('lists every place a value breaks a rule, with its path', () => {
    const rule = shape<{ a: number; b: string | null; c?: boolean; d: { e: string }[]; f: 'x' | 'y' }>({
      a: 'number',
      b: nullable('string'),
      c: optional('boolean'),
      d: arrayOf(shape<{ e: string }>({ e: 'string' })),
      f: oneOf('x', 'y'),
    });
    expect(checkShape({ a: 1, b: null, d: [{ e: 'ok' }], f: 'x', extra: true }, rule)).toEqual([]);
    expect(checkShape({ a: '1', b: 2, c: 'no', d: [{ e: 1 }], f: 'z' }, rule)).toEqual([
      '$.a: expected number, got string',
      '$.b: expected string, got number',
      '$.c: expected boolean, got string',
      '$.d[0].e: expected string, got number',
      '$.f: expected one of x | y, got "z"',
    ]);
    expect(checkShape(undefined, rule)).toEqual(['$: expected object, got undefined']);
  });

  it('catches the drift this contract fixed (a string colourKey, a nested highlight)', () => {
    const lesson = { colourKey: 'mth' };
    expect(checkShape(lesson, shape<{ colourKey: number }>({ colourKey: 'number' }))).toEqual(['$.colourKey: expected number, got string']);
    expect(checkShape({ id: 'c', name: 'Ada', grade: 'Grade 5' }, CHILD_SUMMARY)).toContain('$.averageGrade: expected string, got undefined (missing)');
  });
});

describe.each(['family', 'no-term', 'no-class'] as const)('the screens against the fixtures (%s)', (scenario) => {
  it('every family-wide screen gets the shape it reads', async () => {
    serve(scenario);
    for (const check of FAMILY_CHECKS) {
      expect({ screen: check.screen, problems: checkShape(await check.load(''), check.rule) }).toEqual({ screen: check.screen, problems: [] });
    }
  });

  it('every child screen gets the shape it reads, with the child header agreeing with the path', async () => {
    const installed = serve(scenario);
    const children = await getChildren();
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      // A child the school has not placed in a class sees the no-class state, not these screens.
      if (!child.class) continue;
      for (const check of CHILD_CHECKS) {
        const problems = checkShape(await check.load(child.id), check.rule);
        expect({ screen: check.screen, child: child.name, problems }).toEqual({ screen: check.screen, child: child.name, problems: [] });
      }
    }
    expect(childHeaderMismatches(installed.requests)).toEqual([]);
    // Every learner-view request carried the header (the fixtures refuse one without it).
    const scoped = installed.requests.filter((request) => request.path.startsWith('/parents/me/children/') && request.path.split('/').length > 5);
    expect(scoped.every((request) => request.headers[CHILD_HEADER])).toBe(true);
  });
});

describe('the no-term school (like Hillview)', () => {
  it('answers a null term everywhere a term would be, and no report terms', async () => {
    serve('no-term');
    const [child] = await getChildren();
    const dashboard = (await CHILD_CHECKS.find((check) => check.screen === 'Dashboard')?.load(child.id)) as { term: unknown; schoolDay: { reason: string } };
    expect(checkShape(dashboard, DASHBOARD)).toEqual([]);
    expect(dashboard.term).toBeNull();
    expect(dashboard.schoolDay.reason).toBe('no_term');
    expect(await CHILD_CHECKS.find((check) => check.screen === 'Results (report card)')?.load(child.id)).toBeNull();
  });
});
