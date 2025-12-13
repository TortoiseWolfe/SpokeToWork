# Dependency Update Guide

This document provides guidance for maintaining and updating project dependencies.

## Quick Reference

```bash
# Check for vulnerabilities
docker compose exec spoketowork pnpm audit

# Update a specific package
docker compose exec spoketowork pnpm update <package-name>

# Update all packages (minor/patch only)
docker compose exec spoketowork pnpm update

# Update to latest (including major versions)
docker compose exec spoketowork pnpm update --latest

# Check outdated packages
docker compose exec spoketowork pnpm outdated

# Regenerate lockfile after package.json changes
docker compose exec spoketowork pnpm install
```

## Update Process

Follow this process when updating dependencies:

### 1. Audit

```bash
docker compose exec spoketowork pnpm audit
```

Review any vulnerabilities. Note severity levels and whether patches are available.

### 2. Update

For **security patches** (any severity):

```bash
docker compose exec spoketowork pnpm update <vulnerable-package>
```

For **routine updates**:

```bash
docker compose exec spoketowork pnpm update
```

### 3. Test

```bash
# Run full test suite
docker compose exec spoketowork pnpm test

# Run build to verify no breaking changes
docker compose exec spoketowork pnpm build

# Build Storybook
docker compose exec spoketowork pnpm build-storybook
```

### 4. Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): update dependencies

- Updated <packages>
- Resolved <vulnerabilities if any>"
```

## Decision Framework

### Patch Updates (x.x.X)

- **Risk**: Low
- **Action**: Apply immediately
- **Testing**: Run `pnpm test` and `pnpm build`
- **Example**: `1.2.3` → `1.2.4`

### Minor Updates (x.X.0)

- **Risk**: Medium
- **Action**: Review changelog, then apply
- **Testing**: Full test suite + manual smoke test
- **Example**: `1.2.0` → `1.3.0`

### Major Updates (X.0.0)

- **Risk**: High
- **Action**: Create feature branch, comprehensive testing
- **Testing**: Full suite + E2E + review breaking changes
- **Example**: `1.0.0` → `2.0.0`

### Decision Checklist

Before updating a major version:

- [ ] Read the changelog/migration guide
- [ ] Check GitHub issues for known problems
- [ ] Verify peer dependency compatibility
- [ ] Test in isolation on a feature branch
- [ ] Update any deprecated API usage

## Quarterly Review

Every quarter, perform a comprehensive dependency review:

### Review Checklist

- [ ] Run `pnpm audit` - address all vulnerabilities
- [ ] Run `pnpm outdated` - review available updates
- [ ] Check for deprecated packages
- [ ] Review Renovate dashboard for pending PRs
- [ ] Update Node.js to latest LTS if needed
- [ ] Update pnpm to latest stable
- [ ] Review and update GitHub Actions versions
- [ ] Test full CI pipeline after updates

### Schedule

- **Q1**: January
- **Q2**: April
- **Q3**: July
- **Q4**: October

Use the GitHub Issue template "Dependency Review" to track quarterly reviews.

## Current Stack

| Package      | Version | Rationale                                            |
| ------------ | ------- | ---------------------------------------------------- |
| Node.js      | 22 LTS  | Latest LTS, improved memory management, native fetch |
| Next.js      | 15.x    | App Router, React 19 support, static export          |
| React        | 19.x    | Concurrent features, improved hydration              |
| TypeScript   | 5.9.x   | Better inference, decorator support                  |
| Vitest       | 4.x     | Fixed tinypool IPC issues, faster execution          |
| Tailwind CSS | 4.x     | CSS-first config, improved performance               |
| pnpm         | 10.x    | Faster installs, strict mode, workspace support      |
| Playwright   | 1.55+   | E2E testing with latest browser support              |

### Why These Choices

- **Node.js 22**: LTS release with improved V8, better memory management
- **Next.js 15**: Stable App Router, excellent static export support for GitHub Pages
- **React 19**: Required by Next.js 15, provides latest React features
- **Vitest 4**: Resolved memory issues with tinypool, faster than Jest
- **pnpm**: Faster and more disk-efficient than npm/yarn

## Troubleshooting

### Vulnerability with No Patch Available

If `pnpm audit` shows a vulnerability without a patch:

1. Check if it's a dev-only dependency
2. Assess actual risk (is the vulnerable code path used?)
3. If low risk dev dep, document and monitor
4. If high risk, consider alternatives or raise issue upstream

### Peer Dependency Warnings

Peer dependency warnings are often informational:

```bash
# Check if the warning causes actual issues
docker compose exec spoketowork pnpm test
docker compose exec spoketowork pnpm build
```

If tests/build pass, warnings can often be ignored.

### Lockfile Conflicts

If lockfile gets corrupted or conflicts:

```bash
docker compose exec spoketowork rm pnpm-lock.yaml
docker compose exec spoketowork pnpm install
```

### Transitive Vulnerability

For vulnerabilities in transitive dependencies, use pnpm overrides:

```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": ">=fixed.version"
    }
  }
}
```

## Dev vs Prod Dependencies

Security vulnerabilities affect both `dependencies` and `devDependencies`:

| Severity | Production Deps        | Dev Deps          |
| -------- | ---------------------- | ----------------- |
| Critical | Fix immediately        | Fix immediately   |
| High     | Fix immediately        | Fix immediately   |
| Moderate | Include in next update | Next update cycle |
| Low      | Next update cycle      | Quarterly review  |

**Why dev deps matter**: Dev dependencies run on developer machines and CI. A compromised dev dependency can inject malicious code during build, affecting the production bundle.

## Automation

This project uses [Renovate](https://www.mend.io/renovate/) for automated dependency updates:

- **Patch updates**: Auto-merged if CI passes
- **Minor updates**: Grouped into weekly PR
- **Major updates**: Individual PRs with "breaking" label

See `.github/renovate.json` for configuration.
