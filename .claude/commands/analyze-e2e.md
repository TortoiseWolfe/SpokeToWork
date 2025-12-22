---
description: Analyze E2E test failures from test-results folder and generate SpecKit-compatible remediation report
---

## User Input

```text
$ARGUMENTS
```

Parse for:

- `--category <name>` - Analyze only specific category (auth, accessibility, messaging, etc.)

---

## PHASE 1: Scan Test Results

**REQUIRED ACTIONS:**

1. Check if test-results directory exists and has content:

   ```bash
   ls -la test-results/ 2>/dev/null | head -5
   ```

2. Count total failure directories:

   ```bash
   ls -d test-results/*/ 2>/dev/null | wc -l
   ```

3. Identify unique test failures (excluding retries):

   ```bash
   ls test-results/ | sed 's/-chromium.*$//' | sed 's/-firefox.*$//' | sed 's/-webkit.*$//' | sort -u | wc -l
   ```

4. Count failures by category (extract first word before hyphen):
   ```bash
   ls test-results/ | cut -d'-' -f1 | sort | uniq -c | sort -rn
   ```

**If test-results/ is empty or missing:**

- Report: "No test failures found in test-results/. Run E2E tests first."
- Suggest: `docker compose exec spoketowork pnpm exec playwright test`
- STOP execution.

**REQUIRED OUTPUT:**
Create a summary table:

| Metric                    | Count                                |
| ------------------------- | ------------------------------------ |
| Total failure directories | <N>                                  |
| Unique test failures      | <M>                                  |
| Categories                | auth (<X>), accessibility (<Y>), ... |

---

## PHASE 2: Parse Error Context Files

**REQUIRED ACTIONS:**

For each category with failures, read 2-3 representative `error-context.md` files.

1. Read error context for auth failures (if present):

   ```bash
   ls test-results/auth-*/error-context.md 2>/dev/null | head -3
   ```

2. Read error context for accessibility failures (if present):

   ```bash
   ls test-results/accessibility-*/error-context.md 2>/dev/null | head -3
   ```

3. For each error-context.md, extract:
   - **Current URL** - Look for navigation links, page structure
   - **Page state** - Is user at sign-in page? Home page? Expected page?
   - **Missing elements** - What elements are absent that tests expect?
   - **Visible overlays** - Cookie banners, modals, alerts

4. Categorize each failure by ROOT CAUSE:

   | Root Cause         | Pattern to Look For                                        |
   | ------------------ | ---------------------------------------------------------- |
   | AUTH_FAILURE       | Page shows "Sign In" link when authenticated page expected |
   | NAVIGATION_TIMEOUT | Page stuck at home/landing when specific page expected     |
   | ELEMENT_MISSING    | Expected button/form/input not in accessibility tree       |
   | SELECTOR_INVALID   | Element exists with different text/role than expected      |
   | OVERLAY_BLOCKING   | Cookie consent, modal, or alert visible and blocking       |
   | STATE_LEAK         | Wrong user signed in, stale data from previous test        |
   | ENV_MISSING        | References to undefined env vars or missing credentials    |
   | FLAKY_TIMING       | Different page states across retry attempts                |

**REQUIRED OUTPUT:**
Create root cause frequency table:

| Root Cause      | Count | Example Test             |
| --------------- | ----- | ------------------------ |
| AUTH_FAILURE    | <N>   | auth-complete-flows-...  |
| ELEMENT_MISSING | <N>   | accessibility-avatar-... |

---

## PHASE 3: Correlate with Test Source Files

**REQUIRED ACTIONS:**

1. List E2E test files by category:

   ```bash
   ls tests/e2e/auth/*.spec.ts 2>/dev/null
   ls tests/e2e/accessibility/*.spec.ts 2>/dev/null
   ls tests/e2e/messaging/*.spec.ts 2>/dev/null
   ls tests/e2e/payment/*.spec.ts 2>/dev/null
   ls tests/e2e/routes/*.spec.ts 2>/dev/null
   ls tests/e2e/companies/*.spec.ts 2>/dev/null
   ```

2. For the top 5 failing test categories, identify the source files:
   - Map failure directory names to test file names
   - Example: `auth-complete-flows-*` → `tests/e2e/auth/complete-flows.spec.ts`

3. Check test file structure for common issues:
   - Look for `beforeEach` hooks that require auth
   - Look for hardcoded selectors that may have changed
   - Look for timing-sensitive waits

**REQUIRED OUTPUT:**
Test file mapping table:

| Test File                                         | Failures | Root Causes     |
| ------------------------------------------------- | -------- | --------------- |
| tests/e2e/auth/complete-flows.spec.ts             | <N>      | AUTH_FAILURE    |
| tests/e2e/accessibility/colorblind-toggle.spec.ts | <N>      | ELEMENT_MISSING |

---

## PHASE 4: Assign Severity and Generate Report

**Severity Assignment Heuristic:**

| Severity | Criteria                                                                      |
| -------- | ----------------------------------------------------------------------------- |
| CRITICAL | All retries failed + affects core flow (auth/navigation) + blocks other tests |
| HIGH     | All retries failed + specific feature broken but not blocking                 |
| MEDIUM   | Some retries passed OR inconsistent failure pattern                           |
| LOW      | Single failure OR known flaky test OR likely env/timing issue                 |

**REQUIRED ACTIONS:**

1. Create output directory:

   ```bash
   mkdir -p docs/specs/e2e-remediation
   ```

2. Generate `docs/specs/e2e-remediation/analysis-report.md` with this structure:

```markdown
# E2E Test Failure Analysis Report

**Generated**: [DATE]
**Test Results Path**: test-results/
**Total Failures**: <N> unique failures (<M> with retries)

## Executive Summary

| Category      | Failures | Primary Root Cause |
| ------------- | -------- | ------------------ |
| auth          | <N>      | AUTH_FAILURE       |
| accessibility | <N>      | ELEMENT_MISSING    |
| [etc.]        |          |                    |

## Severity Breakdown

| Severity | Count | Description                            |
| -------- | ----- | -------------------------------------- |
| CRITICAL | <N>   | Core flows broken, blocks testing      |
| HIGH     | <N>   | Consistent failures, specific features |
| MEDIUM   | <N>   | Inconsistent failures                  |
| LOW      | <N>   | Likely env/timing issues               |

## CRITICAL Issues

| ID      | Test File                   | Test Name | Root Cause   | Evidence                             |
| ------- | --------------------------- | --------- | ------------ | ------------------------------------ |
| E2E-C01 | auth/complete-flows.spec.ts | Flow 1    | AUTH_FAILURE | Page at sign-in instead of dashboard |

[Include all CRITICAL issues]

## HIGH Issues

[Table of HIGH severity issues]

## MEDIUM Issues

[Table of MEDIUM severity issues]

## LOW Issues (Flaky/Timing)

[Table of LOW severity issues]

## Root Cause Analysis

### AUTH_FAILURE (<N> tests)

**Pattern**: Tests expect authenticated state but page shows sign-in

**Affected Files**:

- tests/e2e/auth/complete-flows.spec.ts
- [list others]

**Probable Causes**:

1. Test user credentials not configured in CI environment
2. Session not persisting between page navigations
3. Auth timeout during test setup

**Recommended Fix**:

- Verify TEST_USER_PRIMARY_EMAIL and TEST_USER_PRIMARY_PASSWORD in GitHub Secrets
- Check beforeEach auth setup in test files
- Increase timeout for auth operations

### ELEMENT_MISSING (<N> tests)

**Pattern**: Expected elements not found in DOM

**Affected Files**:

- tests/e2e/accessibility/avatar-upload.a11y.test.ts
- [list others]

**Probable Causes**:

1. Selectors changed in component updates
2. Elements conditionally rendered based on state
3. Page not fully loaded before assertions

**Recommended Fix**:

- Update selectors to match current component structure
- Add explicit waits for element visibility
- Use more stable selectors (data-testid, aria-label)

[Add sections for other root causes as needed]

## Test File Health Summary

| Test File                                | Total Tests | Passing | Failing | Health   |
| ---------------------------------------- | ----------- | ------- | ------- | -------- |
| auth/complete-flows.spec.ts              | <N>         | 0       | <N>     | CRITICAL |
| accessibility/avatar-upload.a11y.test.ts | <N>         | 0       | <N>     | CRITICAL |
| [etc.]                                   |             |         |         |          |

## Recommended Action Plan

### Immediate (CRITICAL)

1. Fix authentication flow - most failures trace to auth issues
2. Verify test user credentials in GitHub Actions secrets

### Short-term (HIGH)

3. Review and update selectors in accessibility tests
4. Add explicit waits for dynamic content

### Medium-term (MEDIUM)

5. Improve test isolation (beforeEach/afterEach cleanup)
6. Add retry logic for network-dependent operations

### Long-term (LOW)

7. Implement better flaky test detection
8. Add test stability monitoring
```

---

## PHASE 5: Update README with SpecKit Workflow Command

**REQUIRED ACTIONS:**

1. Read current README.md to find appropriate location for the remediation section
2. Add a new section (or update existing) with the SpecKit workflow command:

```markdown
## E2E Test Remediation

The following command starts the SpecKit workflow to fix E2E test failures:

\`\`\`bash
/speckit.workflow Fix E2E test failures identified in docs/specs/e2e-remediation/analysis-report.md - [N] CRITICAL, [M] HIGH priority issues across auth and accessibility tests
\`\`\`

**Analysis Report**: [docs/specs/e2e-remediation/analysis-report.md](docs/specs/e2e-remediation/analysis-report.md)
```

**Placement**: Add near the end of README.md, before any footer sections.

---

## PHASE 6: Report Completion

**REQUIRED OUTPUT:**

```
E2E Analysis Complete!

Scanned: <N> failure directories
Unique failures: <M>
Categories: auth (<X>), accessibility (<Y>), ...

Root Causes Identified:
- AUTH_FAILURE: <N> tests
- ELEMENT_MISSING: <N> tests
- [etc.]

Severity Breakdown:
- CRITICAL: <N>
- HIGH: <N>
- MEDIUM: <N>
- LOW: <N>

Report generated: docs/specs/e2e-remediation/analysis-report.md
README updated with SpecKit workflow command

Next Steps:
1. Review the analysis report
2. Copy the command from README.md to start remediation:
   /speckit.workflow Fix E2E test failures...
```

---

## Behavior Rules

- ALWAYS scan ALL directories in test-results/
- NEVER assume root cause without evidence from error-context.md
- GROUP similar failures to identify systemic issues vs one-off failures
- PRIORITIZE auth failures - they often cascade to other test failures
- IDENTIFY flaky tests separately from genuine bugs
- GENERATE actionable recommendations with specific file paths
- UPDATE README.md only if report was successfully generated
- If `--category` argument provided, filter analysis to that category only
