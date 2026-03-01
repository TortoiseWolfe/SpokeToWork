/**
 * Storybook Visual Audit — Automated inspection of all stories
 *
 * Crawls every story in Storybook, checks for rendering issues and reports problems.
 *
 * Run: docker compose exec -e STORYBOOK_URL=http://localhost:6006 spoketowork \
 *   npx playwright test --config=tests/e2e/storybook-audit.config.ts
 */
import { test, expect } from '@playwright/test';

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006';
const PER_STORY_TIMEOUT = 15_000; // 15s max per story (including evaluate)

interface StoryEntry {
  type: string;
  id: string;
  name: string;
  title: string;
}

interface StoryIndex {
  v: number;
  entries: Record<string, StoryEntry>;
}

interface Issue {
  storyId: string;
  title: string;
  name: string;
  severity: 'error' | 'blank' | 'warning';
  message: string;
}

async function getStoryIds(): Promise<StoryEntry[]> {
  const response = await fetch(`${STORYBOOK_URL}/index.json`);
  const index: StoryIndex = await response.json();
  return Object.values(index.entries).filter((e) => e.type === 'story');
}

/** Race a promise against a timeout */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)),
        ms
      )
    ),
  ]);
}

/** Console error noise patterns to ignore */
const NOISE_PATTERNS = [
  'favicon',
  'MSW',
  'worker',
  'net::ERR',
  '404',
  'downloadable font',
  'Failed to fetch', // Supabase API unavailable in Storybook
  'Realtime subscription', // Supabase Realtime unavailable
  'Error fetching', // Supabase data fetch unavailable
  'Uncaught: TypeError: Failed to fetch', // Supabase uncaught fetch
];

test.describe('Storybook Visual Audit', () => {
  let stories: StoryEntry[] = [];

  test.beforeAll(async () => {
    try {
      stories = await getStoryIds();
    } catch {
      stories = [];
    }
    console.log(`\nFound ${stories.length} stories to audit\n`);
  });

  test('audit all stories', async ({ page, context }) => {
    test.skip(stories.length === 0, 'Storybook not available — skipping audit');
    test.setTimeout(600_000); // 10 minutes

    const issues: Issue[] = [];
    let processed = 0;
    let browserCrashed = false;

    for (const story of stories) {
      processed++;

      // If browser crashed, try to recover with a fresh page
      if (browserCrashed) {
        try {
          page = await context.newPage();
          browserCrashed = false;
        } catch {
          issues.push({
            storyId: story.id,
            title: story.title,
            name: story.name,
            severity: 'error',
            message: 'Browser context closed, cannot recover',
          });
          continue;
        }
      }

      const consoleErrors: string[] = [];

      const consoleHandler = (
        msg: import('@playwright/test').ConsoleMessage
      ) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      };
      const errorHandler = (error: Error) => {
        consoleErrors.push(`Uncaught: ${error.message}`);
      };
      page.on('console', consoleHandler);
      page.on('pageerror', errorHandler);

      try {
        // Wrap entire story check in a per-story timeout
        await withTimeout(
          (async () => {
            await page.goto(
              `${STORYBOOK_URL}/iframe.html?id=${story.id}&viewMode=story`,
              { timeout: 10_000, waitUntil: 'load' }
            );
            // Brief wait for React hydration
            await page.waitForTimeout(300);

            // Check: blank page
            const contentCheck = await page.evaluate(() => {
              const root =
                document.getElementById('storybook-root') || document.body;
              return {
                height: root.scrollHeight,
                hasContent:
                  (root.innerText?.trim().length || 0) > 0 ||
                  root.querySelectorAll('img, svg, canvas, video, iframe')
                    .length > 0,
              };
            });

            if (contentCheck.height < 10 && !contentCheck.hasContent) {
              issues.push({
                storyId: story.id,
                title: story.title,
                name: story.name,
                severity: 'blank',
                message: 'No visible content',
              });
            }

            // Check: error text in DOM
            const errorInDom = await page.evaluate(() => {
              const text = document.body.innerText || '';
              if (
                text.includes('must be used within') ||
                text.includes('Cannot read properties') ||
                text.includes('is not a function') ||
                text.includes('Something went wrong')
              ) {
                return text.slice(0, 250);
              }
              return null;
            });

            if (errorInDom) {
              issues.push({
                storyId: story.id,
                title: story.title,
                name: story.name,
                severity: 'error',
                message: errorInDom.slice(0, 200),
              });
            }

            // Check: significant console errors (filter out noise)
            const sigErrors = consoleErrors.filter(
              (e) => !NOISE_PATTERNS.some((pattern) => e.includes(pattern))
            );
            for (const err of sigErrors) {
              issues.push({
                storyId: story.id,
                title: story.title,
                name: story.name,
                severity: 'error',
                message: err.slice(0, 200),
              });
            }
          })(),
          PER_STORY_TIMEOUT,
          `story ${story.id}`
        );
      } catch (err) {
        const msg = (err as Error).message;
        if (
          msg.includes('Target page') ||
          msg.includes('browser has been closed')
        ) {
          browserCrashed = true;
          issues.push({
            storyId: story.id,
            title: story.title,
            name: story.name,
            severity: 'error',
            message: `Browser crashed on this story`,
          });
        } else if (msg.includes('Timeout')) {
          issues.push({
            storyId: story.id,
            title: story.title,
            name: story.name,
            severity: 'warning',
            message: `Story hung (>${PER_STORY_TIMEOUT / 1000}s timeout)`,
          });
          // Try to recover by navigating away
          try {
            await page.goto('about:blank', { timeout: 5_000 });
          } catch {
            browserCrashed = true;
          }
        } else {
          issues.push({
            storyId: story.id,
            title: story.title,
            name: story.name,
            severity: 'error',
            message: `Nav failed: ${msg.slice(0, 150)}`,
          });
        }
      } finally {
        page.removeListener('console', consoleHandler);
        page.removeListener('pageerror', errorHandler);
      }

      // Progress every 50 stories
      if (processed % 50 === 0) {
        console.log(`  ...${processed}/${stories.length} stories checked`);
      }
    }

    // === REPORT ===
    console.log('\n' + '='.repeat(80));
    console.log('STORYBOOK AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(`Total stories: ${stories.length}`);
    console.log(`Issues found: ${issues.length}`);

    // Deduplicate: group by storyId, keep first issue
    const seen = new Set<string>();
    const unique = issues.filter((i) => {
      const key = `${i.storyId}:${i.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const errors = unique.filter((i) => i.severity === 'error');
    const warnings = unique.filter((i) => i.severity === 'warning');
    const blanks = unique.filter((i) => i.severity === 'blank');

    if (errors.length > 0) {
      console.log(`\nERRORS (${errors.length}):`);
      for (const i of errors) {
        console.log(`  [${i.storyId}] ${i.title} / ${i.name}`);
        console.log(`    ${i.message}\n`);
      }
    }

    if (warnings.length > 0) {
      console.log(`\nWARNINGS (${warnings.length}):`);
      for (const i of warnings) {
        console.log(`  [${i.storyId}] ${i.title} / ${i.name}`);
        console.log(`    ${i.message}`);
      }
    }

    if (blanks.length > 0) {
      console.log(`\nBLANK PAGES (${blanks.length}):`);
      for (const i of blanks) {
        console.log(`  [${i.storyId}] ${i.title} / ${i.name}`);
      }
    }

    if (unique.length === 0) {
      console.log('\nAll stories rendered without issues!');
    }

    console.log('='.repeat(80) + '\n');

    expect(stories.length).toBeGreaterThan(0);
  });
});
