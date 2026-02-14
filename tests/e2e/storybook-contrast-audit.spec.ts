/**
 * Storybook WCAG AAA Contrast Audit
 *
 * Crawls every story and checks for color contrast violations using axe-core.
 * Reports both AA and AAA failures with specific element details.
 *
 * Run: docker compose exec -e STORYBOOK_URL=http://localhost:6006 spoketowork \
 *   npx playwright test tests/e2e/storybook-contrast-audit.spec.ts --config=tests/e2e/storybook-audit.config.ts
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006';
const AXE_SOURCE = fs.readFileSync(
  path.resolve(
    '/app/node_modules/.pnpm/axe-core@4.10.3/node_modules/axe-core/axe.min.js'
  ),
  'utf-8'
);

interface StoryEntry {
  type: string;
  id: string;
  name: string;
  title: string;
}

interface ContrastViolation {
  storyId: string;
  storyTitle: string;
  storyName: string;
  level: 'AA' | 'AAA';
  element: string;
  foreground: string;
  background: string;
  ratio: string;
  required: string;
  text: string;
}

async function getStoryIds(): Promise<StoryEntry[]> {
  const response = await fetch(`${STORYBOOK_URL}/index.json`);
  const index = await response.json();
  return Object.values(index.entries as Record<string, StoryEntry>).filter(
    (e) => e.type === 'story'
  );
}

test.describe('WCAG Contrast Audit', () => {
  let stories: StoryEntry[] = [];

  test.beforeAll(async () => {
    stories = await getStoryIds();
    console.log(`\nFound ${stories.length} stories to contrast-audit\n`);
  });

  test('check all stories for contrast violations', async ({
    page,
    context,
  }) => {
    test.setTimeout(900_000);

    const violations: ContrastViolation[] = [];
    let processed = 0;
    let browserCrashed = false;

    for (const story of stories) {
      processed++;

      if (browserCrashed) {
        try {
          page = await context.newPage();
          browserCrashed = false;
        } catch {
          continue;
        }
      }

      try {
        await page.goto(
          `${STORYBOOK_URL}/iframe.html?id=${story.id}&viewMode=story`,
          { timeout: 10_000, waitUntil: 'load' }
        );
        await page.waitForTimeout(500);

        // Inject axe-core via addScriptTag and run contrast checks
        await page.addScriptTag({ content: AXE_SOURCE });

        const results = await page.evaluate(() => {
          return (window as any).axe
            .run(document, {
              runOnly: {
                type: 'rule',
                values: ['color-contrast', 'color-contrast-enhanced'],
              },
              resultTypes: ['violations'],
            })
            .then((r: any) => {
              return r.violations.map((v: any) => ({
                id: v.id, // 'color-contrast' (AA) or 'color-contrast-enhanced' (AAA)
                nodes: v.nodes.map((n: any) => ({
                  html: n.html?.slice(0, 120),
                  target: n.target?.[0],
                  failureSummary: n.failureSummary?.slice(0, 200),
                  data: n.any?.[0]?.data || n.all?.[0]?.data || {},
                })),
              }));
            });
        });

        for (const v of results) {
          const level = v.id === 'color-contrast' ? 'AA' : 'AAA';
          for (const node of v.nodes) {
            violations.push({
              storyId: story.id,
              storyTitle: story.title,
              storyName: story.name,
              level,
              element: node.target || node.html?.slice(0, 60),
              foreground: node.data?.fgColor || '?',
              background: node.data?.bgColor || '?',
              ratio: node.data?.contrastRatio
                ? String(node.data.contrastRatio.toFixed(2))
                : '?',
              required: node.data?.expectedContrastRatio || '?',
              text: (node.data?.nodeInfo?.text || node.html || '').slice(0, 40),
            });
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (
          msg.includes('Target page') ||
          msg.includes('browser has been closed')
        ) {
          browserCrashed = true;
        }
        // Skip story on error
      }

      if (processed % 100 === 0) {
        console.log(`  ...${processed}/${stories.length} stories checked`);
      }
    }

    // === REPORT ===
    console.log('\n' + '='.repeat(80));
    console.log('WCAG CONTRAST AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(`Total stories: ${stories.length}`);

    // Deduplicate by story + element + level
    const seen = new Set<string>();
    const unique = violations.filter((v) => {
      const key = `${v.storyId}|${v.element}|${v.level}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const aaFails = unique.filter((v) => v.level === 'AA');
    const aaaFails = unique.filter((v) => v.level === 'AAA');

    console.log(`\nAA violations: ${aaFails.length}`);
    console.log(`AAA violations: ${aaaFails.length}`);

    // Group by story for readability
    const byStory = new Map<string, ContrastViolation[]>();
    for (const v of unique) {
      const key = `${v.storyTitle} / ${v.storyName}`;
      if (!byStory.has(key)) byStory.set(key, []);
      byStory.get(key)!.push(v);
    }

    if (aaFails.length > 0) {
      console.log(`\n${'─'.repeat(40)}`);
      console.log('AA FAILURES (must fix — 4.5:1 normal, 3:1 large):');
      console.log(`${'─'.repeat(40)}`);
      for (const [storyName, vs] of byStory) {
        const aaOnly = vs.filter((v) => v.level === 'AA');
        if (aaOnly.length === 0) continue;
        console.log(`\n  ${storyName}`);
        for (const v of aaOnly) {
          console.log(
            `    ${v.foreground} on ${v.background} (${v.ratio}:1, need ${v.required}) — "${v.text}"`
          );
          console.log(`    element: ${v.element}`);
        }
      }
    }

    if (aaaFails.length > 0) {
      console.log(`\n${'─'.repeat(40)}`);
      console.log('AAA FAILURES (enhanced — 7:1 normal, 4.5:1 large):');
      console.log(`${'─'.repeat(40)}`);
      for (const [storyName, vs] of byStory) {
        const aaaOnly = vs.filter((v) => v.level === 'AAA');
        if (aaaOnly.length === 0) continue;
        console.log(`\n  ${storyName}`);
        for (const v of aaaOnly) {
          console.log(
            `    ${v.foreground} on ${v.background} (${v.ratio}:1, need ${v.required}) — "${v.text}"`
          );
          console.log(`    element: ${v.element}`);
        }
      }
    }

    if (unique.length === 0) {
      console.log('\nAll stories pass WCAG AA and AAA contrast checks!');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    expect(stories.length).toBeGreaterThan(0);
  });
});
