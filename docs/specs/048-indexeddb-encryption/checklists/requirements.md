# Requirements Quality Checklist: 048-indexeddb-encryption

**Feature**: Remove IndexedDB Private Key Storage
**Date**: 2025-12-14
**Reviewer**: Claude Code
**Status**: Ready for implementation

## Purpose

This checklist validates the QUALITY of the requirements in `spec.md`, not the implementation behavior.

---

## Completeness

| ID     | Item                                                                         | Status | Notes                                                     |
| ------ | ---------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| CHK001 | Are all affected files explicitly listed? [Spec §Files Affected]             | ✅     | 5 must-change, 4 may-change files listed                  |
| CHK002 | Is the scope clearly bounded with Out of Scope section? [Spec §Out of Scope] | ✅     | 4 items explicitly excluded                               |
| CHK003 | Are success metrics defined and measurable? [Spec §Success Metrics]          | ✅     | 4 metrics: functionality (2), code quality (1), tests (1) |
| CHK004 | Is the root cause documented? [Spec §Root Cause]                             | ✅     | Feature 032 incomplete migration identified               |

---

## Clarity

| ID     | Item                                                                       | Status | Notes                                       |
| ------ | -------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| CHK005 | Is "broken" behavior quantified? [Spec §Current Bug]                       | ✅     | Specific: returns null, 2 call sites listed |
| CHK006 | Are the two key patterns clearly distinguished? [Spec §Problem Statement]  | ✅     | New vs Legacy design with bullet points     |
| CHK007 | Is migration strategy clear (flush vs preserve)? [Spec §Clarifications]    | ✅     | Q3: "Beta data can be flushed"              |
| CHK008 | Are acceptance criteria testable for each scenario? [Spec §User Scenarios] | ✅     | Each scenario has specific AC bullets       |

---

## Consistency

| ID     | Item                                                                 | Status | Notes                                                                                     |
| ------ | -------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| CHK009 | Do FR-001/FR-002 match Files Affected?                               | ✅     | Both files listed in Must Change                                                          |
| CHK010 | Does FR-005 (remove table) align with database.ts in Files Affected? | ✅     | database.ts listed as Must Change                                                         |
| CHK011 | Are test file updates (FR-007-009) reflected in Files Affected?      | ⚠️     | encryption.test.ts listed, but gdpr-service.test.ts and key-service.test.ts in May Change |
| CHK012 | Is the flow diagram consistent with code references?                 | ✅     | Technical Notes section matches file analysis                                             |

---

## Measurability

| ID     | Item                                                            | Status | Notes                               |
| ------ | --------------------------------------------------------------- | ------ | ----------------------------------- |
| CHK013 | Can "no calls to getPrivateKey in production" be verified? [AC] | ✅     | Grep search with --exclude tests    |
| CHK014 | Can "message decryption works" be verified? [Success Metrics]   | ✅     | Manual E2E test or integration test |
| CHK015 | Can "no dead code" be verified? [Success Metrics]               | ✅     | Grep for removed method names       |
| CHK016 | Can "tests pass" be verified? [Success Metrics]                 | ✅     | pnpm test command                   |

---

## Coverage

| ID     | Item                                                    | Status | Notes                                 |
| ------ | ------------------------------------------------------- | ------ | ------------------------------------- |
| CHK017 | Are all P0 requirements covered by acceptance criteria? | ✅     | FR-001 to FR-005 all have specific AC |
| CHK018 | Are P1 test requirements covered?                       | ✅     | FR-007-009 specify test file updates  |
| CHK019 | Is documentation update requirement present?            | ✅     | FR-011 covers QUICKSTART.md           |
| CHK020 | Is type cleanup covered?                                | ✅     | FR-010 covers PrivateKey type removal |

---

## Edge Cases

| ID     | Item                                                                 | Status | Notes                                             |
| ------ | -------------------------------------------------------------------- | ------ | ------------------------------------------------- |
| CHK021 | What happens if getCurrentKeys() returns null? [Gap]                 | ⚠️     | Need to specify behavior - user re-auth required? |
| CHK022 | What happens to existing data in messaging_private_keys table? [Gap] | ✅     | Clarified: beta data can be flushed               |
| CHK023 | How does Dexie handle schema version change? [Gap]                   | ⚠️     | May need migration strategy in plan               |
| CHK024 | What if user has multiple tabs open during migration? [Gap]          | ⚠️     | Memory-only keys are per-tab anyway               |

---

## Summary

| Category      | Pass   | Warn  | Fail  | Total  |
| ------------- | ------ | ----- | ----- | ------ |
| Completeness  | 4      | 0     | 0     | 4      |
| Clarity       | 4      | 0     | 0     | 4      |
| Consistency   | 3      | 1     | 0     | 4      |
| Measurability | 4      | 0     | 0     | 4      |
| Coverage      | 4      | 0     | 0     | 4      |
| Edge Cases    | 1      | 3     | 0     | 4      |
| **Total**     | **20** | **4** | **0** | **24** |

---

## Recommendations

1. **CHK011**: Move gdpr-service.test.ts and key-service.test.ts from "May Change" to "Must Change" since FR-008 and FR-009 require them.

2. **CHK021**: Add explicit handling for null keys case:
   - Option A: Show error modal prompting re-authentication
   - Option B: Return early with empty/error state
   - **Recommended**: Option B (graceful degradation) since this is a rare edge case

3. **CHK023**: Dexie schema changes are handled by version increment. Since we're removing a table, no migration needed - Dexie will ignore old data.

4. **CHK024**: Multi-tab is not a concern - each tab derives its own keys on auth. No cross-tab key sharing was ever implemented.

---

## Approval

- [x] Requirements are complete enough to begin implementation
- [x] No blocking issues identified
- [x] Warnings are documented and have mitigations
