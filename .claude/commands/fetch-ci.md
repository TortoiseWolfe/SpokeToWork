---
description: Download and extract E2E test artifacts from GitHub Actions CI
allowedTools:
  - Bash(grep:*)
  - Bash(cut:*)
  - Bash(git:*)
  - Bash(curl:*)
  - Bash(mkdir:*)
  - Bash(ls:*)
  - Bash(rm:*)
  - Bash(find:*)
  - Bash(head:*)
  - Bash(tail:*)
  - Bash(cat:*)
  - Bash(wc:*)
  - Bash(python3:*)
  - Bash(unzip:*)
  - Bash(du:*)
  - Bash(sed:*)
  - Bash(xargs:*)
  - Bash(sort:*)
  - Bash(cd:*)
  - Read
  - Write
  - Glob
  - Grep
  - WebFetch
---

## User Input

```text
$ARGUMENTS
```

Parse for:

- `--run <run_id>` - Specific workflow run ID (default: latest failed run)
- `--branch <branch>` - Filter by branch name (default: current branch)
- `--all` - Download all artifacts, not just playwright-report

---

## PHASE 1: Get GitHub Token and Repo Info

**REQUIRED ACTIONS:**

1. Read GitHub token from .env:

   ```bash
   grep "^GITHUB_TOKEN=" .env | cut -d'=' -f2
   ```

2. Get repository info from git remote:

   ```bash
   git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/'
   ```

3. Get current branch:
   ```bash
   git branch --show-current
   ```

**If GITHUB_TOKEN is missing:**

- Report: "GITHUB_TOKEN not found in .env. Add it to download CI artifacts."
- Suggest: "Get a token from https://github.com/settings/tokens with `actions:read` scope"
- STOP execution.

---

## PHASE 2: Find Workflow Run

**REQUIRED ACTIONS:**

1. List recent workflow runs for E2E tests:

   ```bash
   curl -s -H "Authorization: Bearer <TOKEN>" \
     "https://api.github.com/repos/<OWNER>/<REPO>/actions/runs?per_page=10&status=completed" \
     | jq '.workflow_runs[] | select(.name | contains("E2E")) | {id, status, conclusion, head_branch, created_at, html_url}' \
     | head -50
   ```

2. If `--run` provided, use that run ID directly.

3. If `--branch` provided, filter runs by `head_branch`.

4. Default: Select the most recent failed run (conclusion: "failure").

**REQUIRED OUTPUT:**

```
Found workflow run:
- Run ID: <run_id>
- Branch: <branch>
- Status: <conclusion>
- Created: <timestamp>
- URL: <html_url>
```

---

## PHASE 3: List and Download Artifacts

**REQUIRED ACTIONS:**

1. List artifacts for the selected run:

   ```bash
   curl -s -H "Authorization: Bearer <TOKEN>" \
     "https://api.github.com/repos/<OWNER>/<REPO>/actions/runs/<RUN_ID>/artifacts" \
     | jq '.artifacts[] | {name, size_in_bytes, archive_download_url}'
   ```

2. Find playwright-report artifact (or all if `--all` flag):
   - Primary: `playwright-report-<shard>` artifacts
   - Secondary: `playwright-report` (merged)

3. Create target directory:

   ```bash
   mkdir -p test-results-ci
   ```

4. Download each artifact:

   ```bash
   curl -L -H "Authorization: Bearer <TOKEN>" \
     -H "Accept: application/vnd.github+json" \
     "<archive_download_url>" \
     -o "test-results-ci/<artifact_name>.zip"
   ```

5. Extract artifacts:
   ```bash
   cd test-results-ci && unzip -o "<artifact_name>.zip" && rm "<artifact_name>.zip"
   ```

**REQUIRED OUTPUT:**

```
Downloaded artifacts:
- playwright-report-1.zip (X MB) -> extracted
- playwright-report-2.zip (X MB) -> extracted
[etc.]

Artifacts extracted to: test-results-ci/
```

---

## PHASE 4: Organize and Index

**REQUIRED ACTIONS:**

1. Check what was extracted:

   ```bash
   ls -la test-results-ci/
   ```

2. If HTML report exists, report its location:

   ```bash
   find test-results-ci -name "index.html" -type f
   ```

3. Count failure snapshots (if present):

   ```bash
   find test-results-ci -name "*.md" -path "*/data/*" | wc -l
   ```

4. Identify unique test failures from page snapshots:
   ```bash
   ls test-results-ci/data/*.md 2>/dev/null | xargs -I{} basename {} | sed 's/-[0-9]*\.md$//' | sort -u | head -20
   ```

**REQUIRED OUTPUT:**

```
CI Artifacts Ready!

Location: test-results-ci/
HTML Report: test-results-ci/index.html (open in browser)
Page Snapshots: <N> markdown files

Quick analysis:
- Total failures: <N>
- Categories: <list first-level directories or filename prefixes>

Next Steps:
1. Open HTML report: open test-results-ci/index.html
2. Run analysis: /analyze-e2e (point to test-results-ci/)
3. Or manually inspect: test-results-ci/data/*.md
```

---

## PHASE 5: Optional - Copy to Standard Location

**ASK USER:**

> "Copy artifacts to test-results/ (overwrites existing)? [y/N]"

If yes:

```bash
rm -rf test-results/*
cp -r test-results-ci/* test-results/
```

---

## Behavior Rules

- ALWAYS check for GITHUB_TOKEN before making API calls
- NEVER expose the full token in output (show first 8 chars only)
- PREFER downloading merged playwright-report over individual shards
- EXTRACT artifacts immediately after download to save space
- PRESERVE existing test-results/ unless user explicitly confirms overwrite
- REPORT download progress for large artifacts
- If API rate limited, suggest waiting or using a different token
