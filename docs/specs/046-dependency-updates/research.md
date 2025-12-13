# Technical Research: Dependency Infrastructure

**Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)

## Research Areas

### 1. pnpm audit in CI

**Decision**: Add `pnpm audit` step that fails on any vulnerability

**Rationale**:

- pnpm audit checks dependencies against npm security advisories
- `--audit-level` flag controls failure threshold
- Default behavior fails on any vulnerability (matches user requirement)

**Alternatives Rejected**:

- `npm audit` - project uses pnpm, not npm
- `snyk` - external service, adds complexity
- Audit-level high/critical only - user chose strictest posture

**Implementation**:

```yaml
- name: Security audit
  run: pnpm audit
```

No `--audit-level` flag needed - pnpm audit fails on any vulnerability by default.

**Caveat**: May need `--ignore` for known issues without fixes. Document in DEPENDENCY-UPDATES.md.

---

### 2. Renovate Configuration

**Decision**: Use Renovate with grouped updates and weekly schedule

**Rationale**:

- More flexible than Dependabot
- Better grouping capabilities
- Supports pnpm workspaces (future-proof)
- Open source, self-hosted option available

**Configuration Strategy**:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", ":semanticCommits", "group:allNonMajor"],
  "schedule": ["before 9am on monday"],
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr"
    },
    {
      "matchUpdateTypes": ["major"],
      "labels": ["dependencies", "breaking"]
    }
  ]
}
```

**Key Decisions**:

- Weekly schedule (Monday morning) reduces PR noise
- Patch updates auto-merge if CI passes
- Major updates get "breaking" label for visibility
- Group non-major updates to reduce PR count

---

### 3. Quarterly Review Process

**Decision**: GitHub Issue template with scheduled reminder

**Rationale**:

- Native GitHub integration
- Searchable history
- Assignable/trackable
- No external tools needed

**Template Structure**:

- Checklist of review tasks
- Links to audit commands
- Decision framework for major updates
- Due date guidance

---

### 4. Documentation Structure

**Decision**: Single `DEPENDENCY-UPDATES.md` in `docs/project/`

**Sections**:

1. **Quick Reference** - Common commands
2. **Update Process** - Step-by-step guide
3. **Decision Framework** - Major/minor/patch guidance
4. **Quarterly Review** - What to check
5. **Current Stack** - Version rationale (from spec)
6. **Troubleshooting** - Common issues

---

## Current Vulnerability Assessment

**Audit Date**: 2025-12-13

| Severity | Count | Key Issues                                                    |
| -------- | ----- | ------------------------------------------------------------- |
| Critical | 1     | Next.js RCE in React flight protocol (GHSA-9qr9-h5gf-34mp)    |
| High     | 4     | Playwright SSL, tar-fs symlink, glob injection, Next.js cache |
| Moderate | 5     | Various transitive dependencies                               |
| Low      | 1     | tmp symlink vulnerability                                     |

**Direct Dependencies to Update:**

| Package          | Current | Required | Advisory            |
| ---------------- | ------- | -------- | ------------------- |
| next             | 15.5.2  | >=15.5.7 | GHSA-9qr9-h5gf-34mp |
| @playwright/test | ^1.55.0 | >=1.55.1 | GHSA-7mvr-c777-76hp |

**Transitive Dependencies:**

- tar-fs (via lighthouse > puppeteer-core)
- glob (via unknown path)
- tmp (via plop > inquirer > external-editor)

These may resolve when direct dependencies update, or may need pnpm overrides.

---

## Open Questions (Resolved)

| Question                 | Resolution                           |
| ------------------------ | ------------------------------------ |
| Audit failure threshold  | Any vulnerability (strictest)        |
| Dependabot vs Renovate   | Renovate (more customizable)         |
| Update cadence tracking  | GitHub Issue template                |
| Where to document        | `docs/project/DEPENDENCY-UPDATES.md` |
| Existing vulnerabilities | Fix before enabling audit in CI      |
