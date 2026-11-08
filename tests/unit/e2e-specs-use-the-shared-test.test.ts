/**
 * Every E2E file takes `test` from the shared fixture, never from `@playwright/test`.
 *
 * WHY. `tests/e2e/fixtures/test.ts` makes each `page.goto()` and `page.reload()` let the
 * page being left finish its own loads first. Without it, WebKit cancels the old page's
 * in-flight requests and then sometimes fails to load the next page ("WebKit encountered
 * an internal error"). The fix lives in ONE place: a spec that imports `test` straight
 * from Playwright opts out without anyone noticing, and the flake comes back in exactly
 * that file.
 *
 * WHAT THIS CHECKS. Under `tests/e2e`, no file other than the fixture itself imports the
 * VALUE `test` (including `test as setup`) from `@playwright/test`. Type-only imports,
 * `expect`, `devices` and the rest are fine. It also checks that it read the suite and
 * saw most specs using the shared fixture, so a scan that reads nothing cannot pass.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const E2E = path.join(ROOT, 'tests', 'e2e');
const FIXTURE = path.join(E2E, 'fixtures', 'test.ts');

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...tsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** Import statements from Playwright, joined across lines so a multi-line import is seen. */
const PLAYWRIGHT_IMPORT =
  /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]@playwright\/test['"]/g;

/** True when the import brings in the value `test`, bare or renamed. */
function importsTestValue(source: string): boolean {
  for (const m of source.matchAll(PLAYWRIGHT_IMPORT)) {
    if (m[1]) continue; // `import type { ... }`
    const names = m[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.some((n) => n === 'test' || n.startsWith('test as ')))
      return true;
  }
  return false;
}

const SHARED_IMPORT = /from\s+['"]\.[./]*\/fixtures\/test['"]/;

describe('E2E files take `test` from the shared fixture', () => {
  const files = tsFiles(E2E).filter((f) => f !== FIXTURE);

  it('reads the suite and finds it using the shared fixture', () => {
    expect(files.length).toBeGreaterThan(50);
    const users = files.filter((f) =>
      SHARED_IMPORT.test(fs.readFileSync(f, 'utf8'))
    );
    expect(users.length).toBeGreaterThan(50);
  });

  it('no file imports `test` straight from @playwright/test', () => {
    const offenders = files
      .filter((f) => importsTestValue(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('can fail: the matcher sees a direct import in each shape the suite uses', () => {
    expect(
      importsTestValue("import { test, expect } from '@playwright/test';")
    ).toBe(true);
    expect(
      importsTestValue("import { test as setup } from '@playwright/test';")
    ).toBe(true);
    expect(
      importsTestValue(
        "import {\n  expect,\n  test,\n} from '@playwright/test';"
      )
    ).toBe(true);
    expect(importsTestValue("import { expect } from '@playwright/test';")).toBe(
      false
    );
    expect(
      importsTestValue("import type { test } from '@playwright/test';")
    ).toBe(false);
  });
});
