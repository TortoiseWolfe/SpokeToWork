# E2E Test Failure Analysis Report

**Generated**: 2025-12-23
**Test Results Path**: test-results-ci/
**CI Run**: https://github.com/TortoiseWolfe/SpokeToWork/actions/runs/20464717989
**Total Traces**: 51 failed tests (153 page snapshots)

## Executive Summary

| Category           | Failures | Primary Root Cause            |
| ------------------ | -------- | ----------------------------- |
| Mobile Responsive  | 15+      | HORIZONTAL_SCROLL             |
| Element Visibility | 12+      | TIMEOUT / ELEMENT_NOT_VISIBLE |
| Touch Targets      | 4+       | TOUCH_TARGET_SIZE             |
| Navigation         | 6+       | TIMEOUT                       |
| Other              | 14       | Various                       |

**Auth Status**: 129/153 snapshots (84%) show authenticated state - auth is working!

## Severity Breakdown

| Severity | Count | Description                                |
| -------- | ----- | ------------------------------------------ |
| HIGH     | 11    | Horizontal scroll issues at 320px viewport |
| HIGH     | 12    | Timeout errors on element interactions     |
| MEDIUM   | 6     | Element visibility failures                |
| MEDIUM   | 4     | Touch target size violations               |
| LOW      | 3     | JSON parse errors                          |
| LOW      | 14    | Other failures                             |

## Error Category Analysis

### HORIZONTAL_SCROLL (11 tests) - HIGH

**Pattern**: Elements overflow viewport at 320px width

**Example Errors**:

- `Horizontal scroll detected (scrollWidth: 603px, viewport: 428px)`
- `10 elements overflow viewport at 320px`
- `Horizontal scroll detected on /blog at 320px: scrollWidth 348px > clientWidth 320px`

**Affected Test Files**:

- `tests/e2e/tests/mobile-horizontal-scroll.spec.ts`
- `tests/e2e/tests/mobile-navigation.spec.ts`
- `tests/e2e/tests/blog-mobile-ux-*.spec.ts`

**Root Cause**: UI components not properly constrained to viewport width at smallest breakpoints.

**Fix Strategy**:

1. Audit CSS for fixed-width elements
2. Add `overflow-x: hidden` where appropriate
3. Use `max-width: 100%` on problematic containers
4. Test at 320px viewport specifically

---

### TIMEOUT (12 tests) - HIGH

**Pattern**: Locator interactions timeout after 10s

**Example Errors**:

- `TimeoutError: locator.click: Timeout 10000ms exceeded`
- `TimeoutError: page.click: Timeout 10000ms exceeded. waiting for locator('a:has-text("Components")')`
- `waiting for locator('text=Explore Components')`

**Affected Test Files**:

- `tests/e2e/tests/cross-page-navigation.spec.ts`
- `tests/e2e/tests/homepage.spec.ts`

**Root Cause**: Elements not becoming interactable in time, possibly due to:

1. Slow page load in CI
2. Elements hidden/covered by other elements
3. Missing elements on certain pages

**Fix Strategy**:

1. Add explicit `waitFor` before interactions
2. Increase timeouts for CI environment
3. Verify element selectors match current UI
4. Check if elements are conditionally rendered

---

### ELEMENT_NOT_VISIBLE (6 tests) - MEDIUM

**Pattern**: Expected elements not visible when test runs

**Example Errors**:

- `expect(locator).toBeVisible() failed - Locator: locator('#game-demo')`
- `expect(locator).toBeVisible() failed - Locator: locator('h1').filter({ hasText: /Component/i })`
- `expect(locator).toBeVisible() failed - Locator: locator('.card').first()`

**Affected Test Files**:

- `tests/e2e/tests/homepage.spec.ts`
- `tests/e2e/tests/accessibility.spec.ts`

**Root Cause**: UI changes or conditional rendering not accounted for in tests.

**Fix Strategy**:

1. Update selectors to match current DOM
2. Add proper waits for dynamic content
3. Use more stable selectors (data-testid)

---

### TOUCH_TARGET_SIZE (4 tests) - MEDIUM

**Pattern**: Interactive elements smaller than 44px minimum

**Example Errors**:

- `Navigation button width must be >= 44px`
- `Button 0 not visible at 320px`

**Affected Test Files**:

- `tests/e2e/tests/mobile-buttons.spec.ts`
- `tests/e2e/tests/mobile-touch-targets.spec.ts`
- `tests/e2e/tests/blog-touch-targets.spec.ts`

**Root Cause**: Mobile UI elements don't meet WCAG touch target requirements.

**Fix Strategy**:

1. Ensure all interactive elements have `min-h-11 min-w-11` (44px)
2. Add padding to small buttons/links
3. Review navigation component sizing

---

### JSON_PARSE (3 tests) - LOW

**Pattern**: Unexpected HTML instead of JSON response

**Example Errors**:

- `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**Root Cause**: API calls returning HTML error pages instead of JSON.

**Fix Strategy**:

1. Check API endpoints for proper error handling
2. Ensure content-type headers are correct
3. May be 404 pages or server errors

---

## Test File Health Summary

| Test File                        | Category   | Issues                       |
| -------------------------------- | ---------- | ---------------------------- |
| mobile-horizontal-scroll.spec.ts | Mobile     | HORIZONTAL_SCROLL            |
| mobile-navigation.spec.ts        | Mobile     | HORIZONTAL_SCROLL, TIMEOUT   |
| mobile-buttons.spec.ts           | Mobile     | TOUCH_TARGET_SIZE            |
| mobile-touch-targets.spec.ts     | Mobile     | TOUCH_TARGET_SIZE            |
| cross-page-navigation.spec.ts    | Navigation | TIMEOUT                      |
| blog-mobile-ux-\*.spec.ts        | Mobile     | HORIZONTAL_SCROLL            |
| homepage.spec.ts                 | Core       | ELEMENT_NOT_VISIBLE, TIMEOUT |

## Recommended Action Plan

### Immediate (HIGH Priority)

1. **Fix horizontal scroll at 320px**
   - Audit navbar/header components for fixed widths
   - Check blog page layouts
   - Add viewport constraints to overflow containers

2. **Increase timeouts for CI**
   - Add `test.setTimeout(30000)` for navigation tests
   - Use `page.waitForLoadState('networkidle')` before assertions

### Short-term (MEDIUM Priority)

3. **Update touch targets to 44px minimum**
   - Review mobile navigation buttons
   - Add `min-h-11 min-w-11` class to small interactive elements

4. **Update element selectors**
   - Replace fragile selectors with data-testid
   - Add waits for dynamic content

### Long-term (LOW Priority)

5. **Improve test stability**
   - Add retry logic for flaky assertions
   - Implement visual regression testing
   - Add test stability monitoring

## Next Steps

Run the SpecKit workflow to fix these issues:

```bash
/speckit.workflow Fix E2E test failures - 11 HORIZONTAL_SCROLL, 12 TIMEOUT, 6 ELEMENT_NOT_VISIBLE issues affecting mobile responsive tests
```
