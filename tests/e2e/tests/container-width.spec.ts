import { test, expect } from '@playwright/test';

/**
 * #79 — `container` must fill the viewport, not the previous breakpoint.
 *
 * Tailwind 4 generates `container`'s max-width ladder from the registered
 * `@theme` breakpoints. This project's ladder is deliberately narrow and
 * mobile-first (`xs` 320, `sm` 430, `md` 768…), which is right for what
 * breakpoints are for — but `container` reused it as a content cap, so between
 * tiers content was pinned to the LOWER value and the remainder became dead
 * gutter. At 767px that was 339px, 43% of the screen, on the 35 files that use
 * a bare `container mx-auto`.
 *
 * Why nothing caught it: a clamped container does not overflow, does not clip,
 * and does not change any accessible name. It is merely narrower than it should
 * be, and nothing asserted a LOWER bound on width. Every other layout gate here
 * checks that content does not exceed its bounds; this is the mirror case.
 */

/** Deliberately includes the exact tier boundaries and the worst case. */
const WIDTHS = [320, 375, 390, 428, 430, 600, 767, 1023, 1280, 1440];

/** `--breakpoint-xl`, and the cap the `@utility container` block sets. */
const CAP = 1280;

/**
 * Assembled at runtime rather than written literally.
 *
 * Tailwind's scanner reads `tests/`, so a literal class name in a spec is
 * enough to make Tailwind emit that class — which is how a test can end up
 * being the only reason the thing it tests exists. `container` is a core
 * utility and would be emitted anyway; the habit is the point.
 */
const CLS = 'contai' + 'ner';

/** Measure a bare `container` element, detached from any page styling. */
async function measureContainer(
  page: import('@playwright/test').Page,
  cls: string
): Promise<number> {
  return page.evaluate((c) => {
    const probe = document.createElement('div');
    probe.className = c;
    document.body.appendChild(probe);
    const width = Math.round(probe.getBoundingClientRect().width);
    probe.remove();
    return width;
  }, cls);
}

test.describe('#79 container width', () => {
  /**
   * MUTATION CHECK: delete the `@utility container { … }` block from
   * globals.css. Tailwind's generated ladder returns and this fails at 375,
   * 390, 428, 430, 600, 767 and 1023 — every width that sits between two tiers.
   */
  test('container fills the viewport at every width below the cap', async ({
    page,
  }) => {
    await page.goto('/sign-in');

    const rows: {
      viewport: number;
      width: number;
      expected: number;
      wasted: number;
    }[] = [];

    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      const width = await measureContainer(page, CLS);
      // documentElement.clientWidth, NOT window.innerWidth: innerWidth
      // includes the vertical scrollbar (~16px in Chromium) while the
      // container's border box does not, which otherwise reads as a constant
      // 16px of "wasted" space at every single width.
      const viewport = await page.evaluate(
        () => document.documentElement.clientWidth
      );
      const expected = Math.min(viewport, CAP);
      rows.push({ viewport, width, expected, wasted: expected - width });
    }

    // 1px of rounding slack. The failures this guards against are 55-339px.
    const clamped = rows.filter((r) => r.wasted > 1);

    expect(
      clamped,
      'container is capped below the viewport — the breakpoint ladder is being ' +
        'used as a content cap again:\n' +
        clamped
          .map(
            (r) =>
              `  ${r.viewport}px viewport -> ${r.width}px container, ` +
              `${r.wasted}px wasted (${((r.wasted / r.viewport) * 100).toFixed(1)}%)`
          )
          .join('\n')
    ).toEqual([]);
  });

  /**
   * The cap itself still has to hold, or "fills the viewport" would be
   * satisfied by having no maximum at all and line lengths would run away on a
   * wide monitor.
   *
   * MUTATION CHECK: remove `max-width` from the `@utility` block — fails at
   * 1920 (container 1920, expected 1280).
   */
  test('container stops widening at the cap', async ({ page }) => {
    await page.goto('/sign-in');
    await page.setViewportSize({ width: 1920, height: 900 });

    const width = await measureContainer(page, CLS);

    expect(width, `container should cap at ${CAP}px on a 1920px viewport`).toBe(
      CAP
    );
  });

  /**
   * Widening the frame must not push anything off-screen. This is the
   * complement of the first test: together they pin the container to exactly
   * the viewport, from neither side.
   *
   * This one only became meaningful once `overflow-x: hidden` came off the
   * frame — while that was in place, scrollWidth could never exceed innerWidth
   * and this could not fail.
   */
  test('widening the container introduces no horizontal overflow', async ({
    page,
  }) => {
    const routes = ['/', '/sign-in', '/blog', '/docs'];
    const bad: string[] = [];

    for (const route of routes) {
      await page.goto(route);
      for (const w of [320, 430, 767, 1023]) {
        await page.setViewportSize({ width: w, height: 900 });
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        if (over > 1) bad.push(`${route} @ ${w}px overflows by ${over}px`);
      }
    }

    expect(bad, bad.join('\n')).toEqual([]);
  });
});
