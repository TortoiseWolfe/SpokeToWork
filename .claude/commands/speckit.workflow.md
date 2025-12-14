---
description: Execute the complete SpecKit workflow from feature description to implementation, including all phases with user checkpoints.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Complete Workflow Overview

This command orchestrates the **complete** SpecKit workflow in sequence:

```
/speckit.constitution  →  /speckit.specify  →  /speckit.clarify  →  /speckit.plan  →  /speckit.checklist  →  /speckit.tasks  →  /speckit.analyze  →  /speckit.taskstoissues  →  /speckit.implement
        ↓                      ↓                    ↓                   ↓                    ↓                     ↓                   ↓                      ↓                       ↓
   Project            Branch +              Refine spec        Tech plan +        Validate           Task list        Consistency       GitHub              Execute
  principles           Spec                (interactive)        artifacts         requirements        generation         check           Issues           implementation
  (optional)                                                                      quality                            (read-only)       (optional)
```

## Execution Steps

---

### Phase 0: Project Constitution (`/speckit.constitution`) - OPTIONAL

**Purpose**: Establish or verify project principles (one-time setup)

**Skip if**: Constitution already exists at `.specify/memory/constitution.md`

1. Check if constitution exists:

   ```bash
   test -f .specify/memory/constitution.md && echo "EXISTS" || echo "MISSING"
   ```

2. **If constitution exists**:
   - Load and display key principles
   - Ask: "Constitution exists. Skip to feature specification? (yes/no)"
   - If no, proceed to update constitution

3. **If constitution missing or update requested**:
   - Guide user through principle definition
   - Create/update `.specify/memory/constitution.md`
   - Principles become non-negotiable gates for all subsequent phases

4. **CHECKPOINT**: Report status and proceed to Phase 1.

---

### Phase 1: Feature Specification (`/speckit.specify`)

**Purpose**: Create feature branch and initial specification

1. Parse the feature description from `$ARGUMENTS`
   - If empty, ERROR: "No feature description provided. Usage: /speckit.workflow <feature description>"

2. Generate a concise short name (2-4 words) for the branch:
   - Extract meaningful keywords from the description
   - Use action-noun format (e.g., "add-user-auth", "fix-payment-bug")

3. Check for existing branches before creating:

   ```bash
   git fetch --all --prune
   ```

   - Check remote branches: `git ls-remote --heads origin | grep -E 'refs/heads/[0-9]+-<short-name>$'`
   - Check local branches: `git branch | grep -E '^[* ]*[0-9]+-<short-name>$'`
   - Check specs directories: Look for `specs/[0-9]+-<short-name>`
   - Use the next available number (highest + 1)

4. Run the branch creation script:

   ```bash
   .specify/scripts/bash/create-new-feature.sh --json "$ARGUMENTS" --number <N> --short-name "<short-name>" "<feature description>"
   ```

5. Load `.specify/templates/spec-template.md` and generate the specification:
   - Fill all mandatory sections
   - Mark unknowns with `[NEEDS CLARIFICATION: ...]` as needed
   - Focus on WHAT and WHY, not HOW
   - Make informed guesses using context and industry standards
   - Document assumptions in Assumptions section

6. Create initial quality checklist at `FEATURE_DIR/checklists/requirements.md`

7. Validate specification against quality criteria:
   - No implementation details
   - Requirements are testable
   - Success criteria are measurable and technology-agnostic

8. **CHECKPOINT**: Report completion:

   > "Phase 1 complete: Branch `<branch-name>` created with spec at `<spec-path>`.
   >
   > Ready to proceed with clarification to refine the specification."

   Wait for user confirmation before proceeding.

---

### Phase 2: Specification Clarification (`/speckit.clarify`)

**Purpose**: Resolve ALL ambiguities until every taxonomy category is Clear

1. Run prerequisite check:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json --paths-only
   ```

2. Load the spec and perform structured ambiguity scan across:
   - Functional scope & behavior
   - Domain & data model
   - Interaction & UX flow
   - Non-functional quality attributes
   - Integration & external dependencies
   - Edge cases & failure handling
   - Constraints & tradeoffs
   - Terminology & consistency
   - Completion signals

3. Generate prioritized clarification questions (**NO QUESTION LIMIT**):
   - Present ONE question at a time
   - Provide **recommended option** with reasoning
   - Format as table with options
   - Accept user's choice, "yes/recommended", or custom answer
   - **Continue until ALL taxonomy categories reach "Clear" status**

4. After each answer, update the spec immediately:
   - Add to `## Clarifications` section with `### Session YYYY-MM-DD`
   - Apply changes to relevant sections
   - Save atomically after each integration

5. Stop ONLY when:
   - **ALL taxonomy categories have reached "Clear" status**
   - User explicitly says "skip clarification" (with risk acknowledgment)
   - **DO NOT** stop on casual signals like "done", "good", "no more"

6. **CHECKPOINT**: Report completion:

   > "Phase 2 complete: <N> clarifications resolved.
   >
   > Coverage summary:
   > | Category | Status |
   > |----------|--------|
   > | Functional Scope | Clear |
   > | Data Model | Resolved |
   > | ... | ... |
   >
   > Ready to proceed with technical planning."

   Wait for user confirmation before proceeding.

---

### Phase 3: Technical Planning (`/speckit.plan`)

**Purpose**: Generate implementation plan and design artifacts

1. Run setup script:

   ```bash
   .specify/scripts/bash/setup-plan.sh --json
   ```

2. Load context:
   - Feature spec (FEATURE_SPEC)
   - Constitution (`.specify/memory/constitution.md`)
   - Plan template (IMPL_PLAN)

3. Execute planning workflow:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section
   - Evaluate gates (ERROR if violations unjustified)

4. **Phase 0 - Research**: Generate `research.md`:
   - Extract unknowns from Technical Context
   - Research best practices for each technology
   - Consolidate findings with Decision/Rationale/Alternatives format

5. **Phase 1 - Design**: Generate artifacts:
   - `data-model.md` - Entities, fields, relationships, validation rules
   - `contracts/` - OpenAPI/GraphQL schemas from functional requirements
   - `quickstart.md` - Integration scenarios

6. Update agent context:

   ```bash
   .specify/scripts/bash/update-agent-context.sh claude
   ```

7. Re-evaluate Constitution Check post-design

8. **CHECKPOINT**: Report completion:

   > "Phase 3 complete: Implementation plan generated.
   >
   > Artifacts created:
   >
   > - `plan.md` - Technical implementation plan
   > - `research.md` - Technical decisions
   > - `data-model.md` - Entity definitions
   > - `contracts/` - API specifications
   > - `quickstart.md` - Integration scenarios
   >
   > Ready to proceed with requirements quality validation."

   Wait for user confirmation before proceeding.

---

### Phase 4: Requirements Quality Validation (`/speckit.checklist`)

**Purpose**: Generate "unit tests for requirements" - validate spec quality

**CRITICAL CONCEPT**: Checklists test the REQUIREMENTS, not the implementation.

1. Run prerequisite check:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json
   ```

2. Ask clarifying questions as needed to determine:
   - Checklist theme/domain (ux, api, security, performance, etc.)
   - Depth level (lightweight pre-commit vs formal release gate)
   - Target audience (author, reviewer, QA)
   - Risk prioritization areas

3. Load feature context:
   - `spec.md` - Requirements and scope
   - `plan.md` - Technical details
   - `tasks.md` - Implementation tasks (if exists)

4. Generate checklist at `FEATURE_DIR/checklists/<domain>.md`:
   - Items test requirement QUALITY, not implementation behavior
   - Categories: Completeness, Clarity, Consistency, Measurability, Coverage, Edge Cases
   - Each item references spec section or uses markers: `[Gap]`, `[Ambiguity]`, `[Conflict]`
   - Number items CHK001, CHK002, etc.

5. **Examples of CORRECT checklist items**:
   - ✅ "Are error handling requirements defined for all API failure modes? [Gap]"
   - ✅ "Is 'fast loading' quantified with specific timing thresholds? [Clarity, Spec §NFR-2]"
   - ✅ "Can 'prominent display' be objectively measured? [Measurability]"

6. **PROHIBITED patterns** (test implementation, not requirements):
   - ❌ "Verify landing page displays 3 cards"
   - ❌ "Test hover states work correctly"

7. **CHECKPOINT**: Report completion:

   > "Phase 4 complete: Requirements quality checklist generated.
   >
   > Checklist: `<checklist-path>`
   > Items: <N> across <N> categories
   > Focus: <domain>
   >
   > Ready to proceed with task generation."

   Wait for user confirmation before proceeding.

---

### Phase 5: Task Generation (`/speckit.tasks`)

**Purpose**: Create actionable, dependency-ordered task list

1. Run prerequisite check:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json
   ```

2. Load design documents:
   - **Required**: `plan.md`, `spec.md`
   - **Optional**: `data-model.md`, `contracts/`, `research.md`, `quickstart.md`

3. Execute task generation:
   - Extract tech stack, libraries, project structure from plan
   - Extract user stories with priorities (P1, P2, P3) from spec
   - Map entities and endpoints to user stories
   - Generate tasks organized by user story

4. Generate `tasks.md` with structure:
   - **Phase 1**: Setup (project initialization)
   - **Phase 2**: Foundational (blocking prerequisites)
   - **Phase 3+**: User Stories in priority order
   - **Final Phase**: Polish & cross-cutting concerns

5. Task format (REQUIRED):

   ```
   - [ ] [TaskID] [P?] [Story?] Description with file path
   ```

   - Example: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`

6. **CHECKPOINT**: Report completion:

   > "Phase 5 complete: Task list generated.
   >
   > Summary:
   >
   > - Total tasks: <N>
   > - Phases: <N>
   > - Parallel opportunities: <N>
   > - Tasks per user story: US1: <N>, US2: <N>, ...
   >
   > Ready to proceed with consistency analysis."

   Wait for user confirmation before proceeding.

---

### Phase 6: Consistency Analysis (`/speckit.analyze`)

**Purpose**: Cross-artifact consistency check with automatic remediation

**FULL REMEDIATION MODE**: This phase automatically applies fixes for ALL issues until zero remain.

1. Run prerequisite check:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
   ```

2. Load artifacts:
   - `spec.md` - Requirements, user stories, edge cases
   - `plan.md` - Architecture, data model, phases
   - `tasks.md` - Task IDs, descriptions, dependencies
   - Constitution - Principle validation

3. Build semantic models:
   - Requirements inventory with stable keys
   - User story/action inventory
   - Task coverage mapping
   - Constitution rule set

4. Run detection passes:
   - **Duplication**: Near-duplicate requirements
   - **Ambiguity**: Vague adjectives, unresolved placeholders
   - **Underspecification**: Missing outcomes, acceptance criteria
   - **Constitution Alignment**: Violations of MUST principles (always CRITICAL)
   - **Coverage Gaps**: Requirements with no tasks, orphaned tasks
   - **Inconsistency**: Terminology drift, conflicting requirements

5. Assign severity:
   - **CRITICAL**: Constitution violations, zero coverage for core requirements
   - **HIGH**: Duplicates, conflicts, ambiguous security/performance
   - **MEDIUM**: Terminology drift, missing non-functional coverage
   - **LOW**: Style improvements, minor redundancy

6. **Apply ALL Remediations** (do not ask for permission):
   - Fix ALL issues regardless of severity (CRITICAL, HIGH, MEDIUM, LOW)
   - Merge duplicates, replace vague terms, add missing items
   - Update spec.md, plan.md, tasks.md as needed
   - Save files atomically after fixes

7. **Re-verify until zero issues**:
   - Re-run all detection passes
   - Apply additional fixes if needed
   - Repeat until analysis shows zero issues

8. **CHECKPOINT**: Report completion:

   > "Phase 6 complete: Consistency analysis and remediation finished.
   >
   > Issues found and fixed: <N>
   > Files modified: [list]
   >
   > Final metrics (all should be zero):
   >
   > - Requirements: <N>
   > - Tasks: <N>
   > - Coverage: 100%
   > - Remaining issues: 0
   >
   > All artifacts are consistent. Ready to proceed to GitHub issues or implementation."

   Wait for user confirmation before proceeding.

---

### Phase 7: GitHub Issues (`/speckit.taskstoissues`) - OPTIONAL

**Purpose**: Convert tasks to GitHub issues for project tracking

**Skip if**: User declines or no GitHub MCP server available

1. Run prerequisite check:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
   ```

2. Verify Git remote is GitHub:

   ```bash
   git config --get remote.origin.url
   ```

   - **ONLY proceed if remote is a GitHub URL**
   - **NEVER create issues in non-matching repositories**

3. For each task in `tasks.md`:
   - Create GitHub issue using GitHub MCP server
   - Preserve task dependencies and labels
   - Link related issues

4. **CHECKPOINT**: Report completion:

   > "Phase 7 complete: <N> GitHub issues created.
   >
   > Issues: [list of issue URLs]
   >
   > Ready to proceed with implementation."

   Wait for user confirmation before proceeding.

---

### Phase 8: Implementation (`/speckit.implement`)

**Purpose**: Execute the implementation plan

1. Run prerequisite check:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
   ```

2. Check checklists status (if `FEATURE_DIR/checklists/` exists):
   - Count complete vs incomplete items per checklist
   - Display status table
   - **If incomplete**: Ask user to confirm proceeding

3. Load implementation context:
   - **Required**: `tasks.md`, `plan.md`
   - **If exists**: `data-model.md`, `contracts/`, `research.md`, `quickstart.md`

4. Project setup verification:
   - Detect technologies from plan.md
   - Create/verify ignore files (.gitignore, .dockerignore, .eslintignore, etc.)

5. Execute tasks phase by phase:
   - **Setup first**: Project structure, dependencies, configuration
   - **Tests before code** (if TDD requested)
   - **Core development**: Models, services, endpoints
   - **Integration**: Database, middleware, external services
   - **Polish**: Final tests, optimization, documentation

6. Progress tracking:
   - Mark tasks complete `[X]` as finished
   - Report after each completed task
   - Halt on non-parallel task failure
   - Continue with parallel tasks [P] if some fail

7. Completion validation:
   - All tasks completed
   - Tests pass
   - Implementation matches specification

8. **FINAL REPORT**:
   > "Implementation complete!
   >
   > Summary:
   >
   > - Tasks completed: <N>/<N>
   > - Tests: <status>
   > - Branch: `<branch-name>`
   >
   > Next steps:
   >
   > - Review changes: `git diff main`
   > - Create PR: `/ship` or `gh pr create`"

---

## Workflow Flags

Include these in `$ARGUMENTS` to modify behavior:

| Flag                  | Effect                                            |
| --------------------- | ------------------------------------------------- |
| `--skip-constitution` | Skip Phase 0 (constitution check)                 |
| `--skip-clarify`      | Skip Phase 2 (clarification) - higher rework risk |
| `--skip-checklist`    | Skip Phase 4 (requirements validation)            |
| `--skip-analyze`      | Skip Phase 6 (consistency analysis)               |
| `--skip-issues`       | Skip Phase 7 (GitHub issues)                      |
| `--to-spec`           | Stop after Phase 1 (specification only)           |
| `--to-plan`           | Stop after Phase 3 (planning only)                |
| `--to-tasks`          | Stop after Phase 5 (task generation only)         |
| `--dry-run`           | Run through Phase 6, skip implementation          |

---

## Error Handling

- If any phase fails, halt workflow and report:
  - Which phase failed
  - Error details
  - How to resume (e.g., "Run `/speckit.plan` to retry")

- If user says "stop", "pause", or "cancel" at any checkpoint:
  - Save current progress
  - Report what was completed
  - Explain how to resume

- If prerequisite script fails:
  - Check if on correct branch
  - Verify spec files exist
  - Suggest running earlier phase first

---

## Behavior Rules

- Always wait for user confirmation at checkpoints
- Never skip phases without explicit user request or flag
- Save progress incrementally (atomic writes)
- Preserve all artifacts even on failure
- Use absolute paths throughout
- Follow Docker-first development practices from CLAUDE.md
- Constitution violations are always CRITICAL and must be fixed immediately
- **Clarify phase**: Ask as many questions as needed until ALL categories are Clear (no question limit)
- **Analyze phase**: Apply ALL remediations automatically until zero issues remain (not read-only)
- Checklists test REQUIREMENTS quality, not implementation behavior
- The goal is **complete coverage and zero issues** before proceeding to implementation
