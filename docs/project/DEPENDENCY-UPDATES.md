# Dependency Update Guide

This document outlines the process for updating dependencies in the SpokeToWork project.

## Current Stack (2025-12)

| Category            | Package      | Version | Update Cadence |
| ------------------- | ------------ | ------- | -------------- |
| **Runtime**         | Node.js      | 22 LTS  | LTS releases   |
| **Framework**       | Next.js      | 15.x    | Minor monthly  |
| **Framework**       | React        | 19.x    | Minor monthly  |
| **Language**        | TypeScript   | 5.x     | Minor monthly  |
| **Styling**         | Tailwind CSS | 4.x     | Minor monthly  |
| **Testing**         | Vitest       | 4.x     | Minor monthly  |
| **Testing**         | Playwright   | 1.x     | Minor monthly  |
| **Package Manager** | pnpm         | 10.x    | Minor monthly  |

## Update Process

### 1. Security Patches (Immediate)

When a security advisory is released:

```bash
# Check for vulnerabilities
docker compose exec spoketowork pnpm audit

# Update affected packages
docker compose exec spoketowork pnpm update <package-name>

# Run full test suite
docker compose exec spoketowork pnpm run test:suite
```

### 2. Patch Updates (x.x.X) - Low Risk

Apply immediately with basic testing:

```bash
# Update all patch versions
docker compose exec spoketowork pnpm update

# Run tests
docker compose exec spoketowork pnpm test

# Commit if passing
git add pnpm-lock.yaml
git commit -m "chore: update patch dependencies"
```

### 3. Minor Updates (x.X.0) - Medium Risk

Review changelog, run comprehensive tests:

```bash
# Check outdated packages
docker compose exec spoketowork pnpm outdated

# Update specific package
docker compose exec spoketowork pnpm update <package>@latest

# Run full suite
docker compose exec spoketowork pnpm run test:suite
docker compose exec spoketowork pnpm run build

# Review changes
git diff pnpm-lock.yaml
```

### 4. Major Updates (X.0.0) - High Risk

Create feature branch, comprehensive testing:

```bash
# Create update branch
git checkout -b deps/update-<package>-vX

# Update package
docker compose exec spoketowork pnpm update <package>@latest

# Run full test suite
docker compose exec spoketowork pnpm run test:suite

# Build and verify
docker compose exec spoketowork pnpm run build

# Test Storybook
docker compose exec spoketowork pnpm run build-storybook

# Create PR for review
gh pr create --title "chore: update <package> to vX"
```

## Dependency Decision Rationale

### Node.js 22 LTS

- **Why**: Latest LTS with improved memory management and native fetch
- **Impact**: Runtime for all environments (Docker, CI, local)
- **Update**: Follow Node.js LTS schedule (even years in April)

### Next.js 15

- **Why**: App Router, React 19 support, optimized static export
- **Impact**: Core framework, routing, SSG
- **Update**: Follow Next.js stable releases

### React 19

- **Why**: Concurrent features, improved hydration, Actions API
- **Impact**: All component rendering
- **Update**: Tied to Next.js compatibility

### Vitest 4

- **Why**: Fixed tinypool IPC issues that caused CI crashes
- **Impact**: All unit and integration tests
- **Update**: Check release notes for breaking changes

### Tailwind CSS 4

- **Why**: CSS-first configuration, improved performance
- **Impact**: All styling, DaisyUI themes
- **Update**: Check for DaisyUI compatibility

### pnpm 10

- **Why**: Faster installs, strict mode, better monorepo support
- **Impact**: All dependency management
- **Update**: Generally safe to update

## Automated Updates (Dependabot)

Dependabot is configured to create PRs for:

- **Security updates**: Immediate
- **Patch updates**: Weekly (Mondays)
- **Minor updates**: Monthly (first Monday)

Configuration: `.github/dependabot.yml`

## Quarterly Review Checklist

Every quarter (January, April, July, October):

- [ ] Run `pnpm outdated` and review all updates
- [ ] Check Node.js LTS schedule
- [ ] Review Next.js/React release notes
- [ ] Verify CI is using latest stable versions
- [ ] Update this document with any new decisions

## Rollback Procedure

If an update causes issues:

```bash
# Revert lockfile
git checkout HEAD~1 -- pnpm-lock.yaml

# Reinstall
docker compose exec spoketowork pnpm install

# Verify fix
docker compose exec spoketowork pnpm test
```

## CI Security Audit

The CI pipeline includes `pnpm audit --audit-level=high` which:

- Reports high and critical vulnerabilities
- Does NOT fail the build (continue-on-error: true)
- Allows manual triage of advisories

To make audit failures block CI, edit `.github/workflows/ci.yml` and remove `continue-on-error: true`.
