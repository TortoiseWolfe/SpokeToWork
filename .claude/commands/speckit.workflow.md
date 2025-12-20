---
description: Execute the complete SpecKit workflow from feature description to implementation, including all phases with user checkpoints.
---

# CRITICAL EXECUTION RULES

**YOU MUST EXECUTE EACH PHASE IN ORDER. NO EXCEPTIONS.**

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
   ↓         ↓         ↓         ↓         ↓         ↓         ↓         ↓         ↓
 STOP      STOP      STOP      STOP      STOP      STOP      STOP      STOP      DONE
```

**FORBIDDEN ACTIONS:**

- ❌ NEVER skip to implementation without completing phases 1-6
- ❌ NEVER write code until Phase 8
- ❌ NEVER assume a phase is "good enough" - complete it fully
- ❌ NEVER proceed past a checkpoint without user confirmation
- ❌ NEVER use your own judgment to skip phases - only explicit `--skip-X` flags allow skipping

**REQUIRED AT START:**

1. Use TodoWrite to create a phase checklist immediately
2. Mark each phase in_progress → completed as you go
3. If you find yourself writing implementation code before Phase 8, STOP and go back

---

## User Input

```text
$ARGUMENTS
```

Parse for:

- Feature description (required unless spec path provided)
- `--skip-*` flags (only way to skip phases)
- `--to-*` flags (stop early)
- Existing spec path (e.g., `docs/specs/045-feature/spec.md`)

---

## PHASE 0: Constitution Check

**REQUIRED ACTIONS:**

1. Run: `test -f .specify/memory/constitution.md && echo "EXISTS" || echo "MISSING"`
2. If EXISTS: Read and display key principles
3. If MISSING: ERROR - run `/speckit.constitution` first

**CHECKPOINT 0:**

```
✓ Constitution verified at .specify/memory/constitution.md
Proceeding to Phase 1...
```

Wait for user to confirm or type "continue".

---

## PHASE 1: Feature Specification

**SKIP IF:** Spec path provided in $ARGUMENTS AND file exists

**REQUIRED ACTIONS:**

1. Generate branch number (check remote, local, specs dirs)
2. Run: `.specify/scripts/bash/create-new-feature.sh --json "$ARGUMENTS" --number <N> --short-name "<name>"`
3. Load `.specify/templates/spec-template.md`
4. Write complete spec to `docs/specs/<N>-<name>/spec.md`
5. Create `docs/specs/<N>-<name>/checklists/` directory

**REQUIRED OUTPUTS:**

- [ ] `docs/specs/<N>-<name>/spec.md` exists
- [ ] Feature branch created or spec path verified
- [ ] Spec has all mandatory sections filled

**CHECKPOINT 1:**

```
Phase 1 COMPLETE.

Created:
- Branch: <branch-name>
- Spec: <spec-path>

Type "continue" to proceed to Phase 2 (Clarification).
```

**HARD STOP. DO NOT PROCEED WITHOUT USER CONFIRMATION.**

---

## PHASE 2: Specification Clarification

**REQUIRED ACTIONS:**

1. Run: `.specify/scripts/bash/check-prerequisites.sh --json --paths-only`
2. Read the spec completely
3. Scan for ambiguities in ALL categories:
   - Functional scope & behavior
   - Domain & data model
   - Interaction & UX flow
   - Non-functional requirements
   - Integration & dependencies
   - Edge cases & errors
   - Constraints & tradeoffs
   - Terminology

4. For EACH ambiguity found:
   - Ask ONE question with options
   - Wait for answer
   - Update spec.md immediately
   - Add to `## Clarifications` section

5. Continue until ALL categories are "Clear"

**REQUIRED OUTPUTS:**

- [ ] `## Clarifications` section added to spec with session date
- [ ] All ambiguous items resolved or marked as explicit assumptions
- [ ] Spec updated with user's answers

**CHECKPOINT 2:**

```
Phase 2 COMPLETE.

Clarifications resolved: <N>
Categories covered:
| Category | Status |
|----------|--------|
| Functional Scope | ✓ Clear |
| Data Model | ✓ Clear |
| ... | ... |

Type "continue" to proceed to Phase 3 (Technical Planning).
```

**HARD STOP. DO NOT PROCEED WITHOUT USER CONFIRMATION.**

---

## PHASE 3: Technical Planning

**REQUIRED ACTIONS:**

1. Run: `.specify/scripts/bash/setup-plan.sh --json`
2. Load spec and constitution
3. Create these artifacts in `docs/specs/<feature>/`:

   a. **plan.md** - Technical implementation plan
   - Architecture decisions
   - Technology choices
   - File structure
   - Dependencies

   b. **research.md** - Technical decisions
   - Unknowns investigated
   - Best practices found
   - Decision/Rationale/Alternatives format

   c. **data-model.md** - Entity definitions
   - Tables/collections
   - Fields and types
   - Relationships
   - Validation rules

4. Run: `.specify/scripts/bash/update-agent-context.sh claude`

**REQUIRED OUTPUTS:**

- [ ] `docs/specs/<feature>/plan.md` exists and is complete
- [ ] `docs/specs/<feature>/research.md` exists
- [ ] `docs/specs/<feature>/data-model.md` exists (if data involved)

**CHECKPOINT 3:**

```
Phase 3 COMPLETE.

Artifacts created:
- plan.md: <path>
- research.md: <path>
- data-model.md: <path>

Type "continue" to proceed to Phase 4 (Requirements Checklist).
```

**HARD STOP. DO NOT PROCEED WITHOUT USER CONFIRMATION.**

---

## PHASE 4: Requirements Quality Checklist

**REQUIRED ACTIONS:**

1. Run: `.specify/scripts/bash/check-prerequisites.sh --json`
2. Read spec.md and plan.md
3. Generate `docs/specs/<feature>/checklists/requirements.md`:
   - Items test REQUIREMENT QUALITY, not implementation
   - Categories: Completeness, Clarity, Consistency, Measurability
   - Format: `- [ ] CHK001: <question> [Category, Spec §X]`

**CORRECT checklist items:**

- ✅ "Are error handling requirements defined for all failure modes?"
- ✅ "Is 'fast loading' quantified with specific thresholds?"
- ✅ "Can success criteria be objectively measured?"

**WRONG checklist items (these test implementation, not requirements):**

- ❌ "Verify the button is blue"
- ❌ "Test that the API returns 200"

**REQUIRED OUTPUTS:**

- [ ] `docs/specs/<feature>/checklists/requirements.md` exists
- [ ] At least 10 checklist items
- [ ] All items reference spec sections

**CHECKPOINT 4:**

```
Phase 4 COMPLETE.

Checklist: <path>
Items: <N> across <N> categories

Type "continue" to proceed to Phase 5 (Task Generation).
```

**HARD STOP. DO NOT PROCEED WITHOUT USER CONFIRMATION.**

---

## PHASE 5: Task Generation

**REQUIRED ACTIONS:**

1. Run: `.specify/scripts/bash/check-prerequisites.sh --json`
2. Read: spec.md, plan.md, data-model.md
3. Generate `docs/specs/<feature>/tasks.md`:

```markdown
# Tasks for <Feature Name>

## Phase 1: Setup

- [ ] T001 [P] Create directory structure
- [ ] T002 [P] Install dependencies

## Phase 2: Foundation

- [ ] T003 [US1] Create data model
- [ ] T004 [US1] Add database migration

## Phase 3: Core Implementation

- [ ] T005 [US1] Implement main component
- [ ] T006 [US1] Add unit tests
- [ ] T007 [US1] Add accessibility tests

## Phase 4: Integration

- [ ] T008 [US2] Connect to existing systems
- [ ] T009 [US2] Add E2E tests

## Phase 5: Polish

- [ ] T010 Update documentation
- [ ] T011 Run full test suite
```

Task format: `- [ ] T<ID> [P?] [US?] Description with file path`

- `[P]` = Can run in parallel
- `[US1]` = Maps to User Story 1

**REQUIRED OUTPUTS:**

- [ ] `docs/specs/<feature>/tasks.md` exists
- [ ] Tasks organized by phase
- [ ] Each task has ID, description, and file path
- [ ] Dependencies are clear (non-P tasks are sequential)

**CHECKPOINT 5:**

```
Phase 5 COMPLETE.

Tasks: <path>
Total: <N> tasks across <N> phases
Parallel opportunities: <N>

Type "continue" to proceed to Phase 6 (Consistency Analysis).
```

**HARD STOP. DO NOT PROCEED WITHOUT USER CONFIRMATION.**

---

## PHASE 6: Consistency Analysis

**REQUIRED ACTIONS:**

1. Run: `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
2. Load: spec.md, plan.md, tasks.md, constitution
3. Check for issues:
   - Duplicate requirements
   - Ambiguous terms remaining
   - Requirements without tasks
   - Tasks without requirements
   - Constitution violations
   - Terminology inconsistencies

4. **FIX ALL ISSUES FOUND** - do not just report them
5. Re-run checks until zero issues remain

**REQUIRED OUTPUTS:**

- [ ] All artifacts are consistent
- [ ] Zero unresolved issues
- [ ] Files updated if fixes were needed

**CHECKPOINT 6:**

```
Phase 6 COMPLETE.

Issues found: <N>
Issues fixed: <N>
Remaining: 0

All artifacts consistent. Type "continue" to proceed to Phase 7 (GitHub Issues) or Phase 8 (Implementation).
```

**HARD STOP. DO NOT PROCEED WITHOUT USER CONFIRMATION.**

---

## PHASE 7: GitHub Issues (OPTIONAL)

**SKIP IF:** User says "skip issues" or `--skip-issues` flag

**REQUIRED ACTIONS:**

1. Verify GitHub remote: `git config --get remote.origin.url`
2. For each task in tasks.md, create GitHub issue
3. Link related issues
4. Update tasks.md with issue URLs

**CHECKPOINT 7:**

```
Phase 7 COMPLETE.

Issues created: <N>
[List of issue URLs]

Type "continue" to proceed to Phase 8 (Implementation).
```

---

## PHASE 8: Implementation

**BEFORE YOU START - VERIFY:**

```
Required artifacts exist:
- [ ] spec.md
- [ ] plan.md
- [ ] tasks.md
- [ ] checklists/requirements.md

If ANY are missing, STOP and go back to the missing phase.
```

**REQUIRED ACTIONS:**

1. Run: `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
2. Display checklist status - ask user to confirm proceeding if incomplete
3. Load tasks.md
4. Execute tasks IN ORDER:
   - Mark `[X]` as you complete each
   - Update tasks.md after each task
   - Run tests after code changes
   - Follow component structure from CLAUDE.md

5. After all tasks:
   - Run type-check: `docker compose exec spoketowork pnpm run type-check`
   - Run lint: `docker compose exec spoketowork pnpm run lint`
   - Run tests: `docker compose exec spoketowork pnpm test`

**FINAL REPORT:**

```
Implementation COMPLETE!

Tasks completed: <N>/<N>
Tests: PASS/FAIL
Type-check: PASS/FAIL
Lint: PASS/FAIL

Branch: <branch-name>

Next steps:
- Review: git diff main
- Commit: /commit
- Ship: /ship or gh pr create
```

---

## Workflow Flags

| Flag                  | Effect               |
| --------------------- | -------------------- |
| `--skip-constitution` | Skip Phase 0         |
| `--skip-clarify`      | Skip Phase 2 (risky) |
| `--skip-checklist`    | Skip Phase 4         |
| `--skip-analyze`      | Skip Phase 6         |
| `--skip-issues`       | Skip Phase 7         |
| `--to-spec`           | Stop after Phase 1   |
| `--to-plan`           | Stop after Phase 3   |
| `--to-tasks`          | Stop after Phase 5   |
| `--dry-run`           | Stop after Phase 6   |

---

## Error Recovery

If you realize you skipped a phase:

1. STOP immediately
2. Tell the user which phase was skipped
3. Go back and complete that phase
4. Resume from where you left off

If a phase fails:

1. Report what failed and why
2. Suggest how to fix it
3. Wait for user before retrying

---

## REMEMBER

1. **Each phase creates artifacts** - if the artifacts don't exist, the phase wasn't done
2. **Checkpoints are HARD STOPS** - never proceed without user saying "continue"
3. **Implementation is Phase 8** - if you're writing code before then, you skipped phases
4. **Use TodoWrite** - track phase progress so you don't lose your place
5. **When in doubt, STOP and ASK** - don't assume you can skip ahead
