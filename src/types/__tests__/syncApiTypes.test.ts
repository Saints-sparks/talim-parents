import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { syncApiTypes } from '../../../scripts/sync-api-types.mjs';

type SyncResult = { status: 'missing-source' | 'unchanged' | 'created' | 'updated' };
const sync = syncApiTypes as (paths: { source: string; target: string }) => SyncResult;

describe('scripts/sync-api-types.mjs', () => {
  let dir: string;
  let source: string;
  let target: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'talim-api-types-'));
    mkdirSync(join(dir, 'backend'));
    source = join(dir, 'backend', 'api-types.d.ts');
    target = join(dir, 'app', 'src', 'types', 'api.d.ts');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('creates the copy (and its folders) the first time', () => {
    writeFileSync(source, 'export interface paths {}\n');
    expect(sync({ source, target }).status).toBe('created');
    expect(readFileSync(target, 'utf8')).toBe('export interface paths {}\n');
  });

  it('reports unchanged when the copy is already identical', () => {
    writeFileSync(source, 'v1');
    sync({ source, target });
    expect(sync({ source, target }).status).toBe('unchanged');
  });

  it('overwrites a stale copy and says so', () => {
    writeFileSync(source, 'v1');
    sync({ source, target });
    writeFileSync(source, 'v2');
    expect(sync({ source, target }).status).toBe('updated');
    expect(readFileSync(target, 'utf8')).toBe('v2');
  });

  it('does nothing, and does not throw, when the backend is not checked out', () => {
    expect(sync({ source: join(dir, 'nope.d.ts'), target }).status).toBe('missing-source');
    expect(() => readFileSync(target)).toThrow();
  });
});
