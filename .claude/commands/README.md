# Claude Commands (Slash Commands)

## What These Are

These are **instruction files** that tell Claude how to generate artifacts for the spec-kit workflow. They are NOT shell scripts or executables.

## Available Commands

### SpecKit Workflow Commands

### `/plan`

**File**: `plan.md`
**Purpose**: Generate implementation plan and design artifacts from a spec
**Creates**:

- plan.md (implementation plan)
- research.md (Phase 0)
- data-model.md (Phase 1)
- contracts/ (Phase 1)
- quickstart.md (Phase 1)

**Usage**: After setting up a feature branch with a spec.md, tell Claude: "execute /plan"

### `/tasks`

**File**: `tasks.md`
**Purpose**: Generate actionable task list from plan artifacts
**Creates**:

- tasks.md (numbered tasks following TDD)

**Usage**: After /plan completes, tell Claude: "execute /tasks" or "proceed with /tasks"

### `/specify`

**File**: `specify.md`
**Purpose**: Initialize a spec-kit project (rarely used, project already initialized)

---

### CI/E2E Analysis Commands

### `/fetch-ci`

**File**: `fetch-ci.md`
**Purpose**: Download E2E test artifacts from GitHub Actions CI
**Creates**:

- test-results-ci/ directory with extracted artifacts

**Usage**: After CI fails, tell Claude: "/fetch-ci" to download the latest failed run's artifacts

**Flags**:

- `--run <id>` - Specific workflow run ID
- `--branch <name>` - Filter by branch
- `--all` - Download all artifacts (not just playwright-report)

### `/analyze-e2e`

**File**: `analyze-e2e.md`
**Purpose**: Analyze E2E test failures and generate remediation report
**Creates**:

- docs/specs/e2e-remediation/analysis-report.md

**Usage**: After running E2E tests locally or downloading CI artifacts

**Flags**:

- `--ci` - Analyze test-results-ci/ (CI artifacts)
- `--path <dir>` - Custom directory
- `--category <name>` - Filter by category (auth, accessibility, etc.)

---

### CI Workflow Example

```bash
# 1. CI fails with E2E test errors

# 2. Download CI artifacts
/fetch-ci

# 3. Analyze failures
/analyze-e2e --ci

# 4. Review report at docs/specs/e2e-remediation/analysis-report.md

# 5. Fix issues based on root cause analysis

# 6. Commit and push
/commit
```

## How They Work

1. These files contain instructions for Claude to follow
2. Claude reads the spec and existing artifacts
3. Claude generates new artifacts based on the instructions
4. No external tools or scripts are required

## Common Misconceptions

❌ **WRONG**: These are shell scripts that need to be executed
✅ **RIGHT**: These are instructions for Claude to follow

❌ **WRONG**: They require setup-plan.sh or other scripts
✅ **RIGHT**: Claude generates everything from the spec

❌ **WRONG**: They use the `uvx specify` tool
✅ **RIGHT**: They work within the existing project structure

## Example Workflow

```bash
# 1. Human creates feature branch
./scripts/prp-to-feature.sh e2e-testing-framework 003

# 2. Human tells Claude
"execute /plan"

# 3. Claude reads plan.md instructions and generates artifacts

# 4. Human tells Claude
"execute /tasks"

# 5. Claude reads tasks.md instructions and generates task list
```

## Important Notes

- The commands are **executed by Claude**, not by shell
- They work by reading and generating markdown files
- No external dependencies beyond the initial project setup
- If scripts are mentioned in the instructions but don't exist, Claude should generate the artifacts directly

---

**Remember**: These are Claude instructions, not executable scripts!
