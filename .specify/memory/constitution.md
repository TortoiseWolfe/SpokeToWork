# SpokeToWork Constitution

## Core Principles

### I. Proper Solutions Over Quick Fixes

Implement correctly the first time. No shortcuts, no "we'll fix it later" approaches. Every implementation should be production-ready from the start.

### II. Root Cause Analysis

Fix underlying issues, not symptoms. When a bug appears, investigate and fix the root cause rather than applying band-aid patches that mask the problem.

### III. Stability Over Speed

This is a production template. Reliability and correctness take precedence over rapid feature delivery. Take the time to do things right.

### IV. Clean Architecture

Follow established patterns consistently. Components follow the 5-file structure. Code organization follows atomic design principles. Patterns once established are followed everywhere.

### V. No Technical Debt

Never commit TODOs or workarounds. If something needs to be done, do it now. If it can't be done now, document it in a spec and track it properly.

## Mandatory Constraints

### Docker-First Development

All development happens through Docker. Never install packages locally. Never use sudo to fix permissions. The container runs as your user with correct permissions.

### Static Hosting Constraint

The app deploys to GitHub Pages (static hosting). No server-side API routes. All server-side logic must be in Supabase (database, Edge Functions, or triggers).

### Component Structure

Components must follow the 5-file pattern or CI/CD will fail:

- `index.tsx` - Barrel export
- `ComponentName.tsx` - Main component
- `ComponentName.test.tsx` - Unit tests (REQUIRED)
- `ComponentName.stories.tsx` - Storybook (REQUIRED)
- `ComponentName.accessibility.test.tsx` - A11y tests (REQUIRED)

### Database Migrations

Never create separate migration files. Use the monolithic migration file. All CREATE statements must be idempotent with IF NOT EXISTS.

## Quality Gates

### Testing Requirements

- Unit tests for all components
- Accessibility tests for all interactive components
- E2E tests for critical user flows
- All tests must pass before merge

### Code Review Standards

- TypeScript strict mode compliance
- ESLint clean (no warnings)
- Type-check passes
- Build succeeds

## Governance

This constitution supersedes all other practices. When in doubt, refer to these principles. Amendments require:

1. Documentation of the change
2. Rationale for the amendment
3. Update to this file and CLAUDE.md

All PRs and reviews must verify compliance with these principles.

**Version**: 1.0.0 | **Ratified**: 2025-12-13 | **Last Amended**: 2025-12-13
