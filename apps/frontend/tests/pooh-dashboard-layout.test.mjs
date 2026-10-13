import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(frontendRoot, '../..');

function poohSource(page) {
  return execFileSync('git', ['show', `origin/pooh:apps/frontend/src/app/${page}/dashboard/page.tsx`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function withoutProximityNotice(source) {
  return source
    .replace(/^import \{ ProximityNotice \} from '@\/components\/shared\/ProximityNotice';\r?\n/m, '')
    .replace(/^      <ProximityNotice \/>\r?\n/m, '')
    .replace(/\r\n/g, '\n');
}

for (const page of ['admin', 'guard']) {
  test(`${page} dashboard matches origin/pooh except for ProximityNotice`, () => {
    const actual = readFileSync(path.join(frontendRoot, 'src/app', page, 'dashboard/page.tsx'), 'utf8');
    const baseline = poohSource(page);
    assert.notEqual(actual, baseline, 'expected the retained notice addition');
    assert.equal(withoutProximityNotice(actual), baseline.replace(/\r\n/g, '\n'));
    assert.match(actual, /^import \{ ProximityNotice \} from '@\/components\/shared\/ProximityNotice';$/m);
    assert.equal((actual.match(/<ProximityNotice \/>/g) ?? []).length, 1);
  });
}
