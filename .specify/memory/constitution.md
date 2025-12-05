<!--
Sync Impact Report - Constitution Amendment
Version Change: 1.0.1 → 1.1.0 (MINOR)
Amendment Date: 2025-12-04

Rationale: Minor version bump - adding 6 new product-specific principles
derived from SpokeToWork core PRP (docs/prp-docs/spoketowork-core-prp.md).
No existing principles removed or modified.

Added Principles (from core PRP):
  - VII. Company Tracking & Status Management
  - VIII. Geographic Data Accuracy
  - IX. Route Cluster Organization
  - X. Bicycle-Optimized Routing
  - XI. Multi-Format Export
  - XII. Field Operations Support

Existing Principles (unchanged):
  ✅ I. Component Structure Compliance
  ✅ II. Test-First Development
  ✅ III. PRP Methodology
  ✅ IV. Docker-First Development
  ✅ V. Progressive Enhancement (PWA, offline, accessibility)
  ✅ VI. Privacy & Compliance First

Templates: No updates required (generic templates work with additions)
Follow-up TODOs: None
-->

# SpokeToWork Constitution

## Core Principles

### I. Component Structure Compliance

Every component MUST follow the 5-file pattern: index.tsx, Component.tsx,
Component.test.tsx, Component.stories.tsx, and Component.accessibility.test.tsx.
This structure is enforced via CI/CD pipeline validation. Use the component
generator (`pnpm run generate:component`) to ensure compliance. No exceptions
are permitted - manual component creation will cause build failures.

### II. Test-First Development

Tests MUST be written before implementation following RED-GREEN-REFACTOR cycle.
Minimum test coverage of 25% for unit tests, with critical paths requiring
comprehensive test suites. E2E tests via Playwright for user workflows.
Accessibility tests using Pa11y for WCAG compliance. Tests run on pre-push
via Husky hooks.

### III. PRP Methodology (Product Requirements Prompts)

Features are implemented using the PRP workflow: define requirements in a PRP
document, execute /plan command for technical planning, execute /tasks for
task generation, then implement. Each PRP tracks from inception to completion
with clear success criteria. PRPs supersede ad-hoc feature development.

### IV. Docker-First Development

Docker Compose is the primary development environment to ensure consistency
across all developers. Local development is supported but Docker takes
precedence for debugging environment issues. All CI/CD uses containerized
environments. Production deployment assumes containerization.

### V. Progressive Enhancement

Start with core functionality that works everywhere, then enhance with
progressive features. PWA capabilities for offline support. Accessibility
features (colorblind modes, font switching) as first-class requirements.
Performance optimization targeting 90+ Lighthouse scores. Mobile-first
responsive design.

### VI. Privacy & Compliance First

GDPR compliance is mandatory with explicit consent for all data collection.
Cookie consent system must be implemented before any tracking. Analytics
only activate after user consent. Geolocation requires explicit permission.
Third-party services need consent modals. Privacy controls accessible to users.

### VII. Company Tracking & Status Management

The system MUST track companies the user intends to visit for job applications.
Each company record includes: name, contact details, physical address, geographic
coordinates, application status (not contacted → contacted → follow-up → meeting
→ outcome), priority level, notes, follow-up dates, route assignment, and
active/inactive flag. Bulk import/export supported. Filter and search required.

### VIII. Geographic Data Accuracy

Geocoded coordinates MUST be verifiably correct before route generation. Visual
verification on a map is required to catch geocoding errors. Manual coordinate
entry MUST be supported for addresses that fail automatic geocoding. Coordinates
MUST be validated within reasonable geographic bounds (~20 mile radius from home).
Incorrect coordinates waste the user's physical effort cycling to wrong locations.

### IX. Route Cluster Organization

Companies MUST be grouped into 5-10 geographic clusters (routes) based on
proximity and directional bearing from the user's home location. Each cluster
should be completable in a single bicycle trip. Clusters minimize backtracking.
Automatic assignment based on distance and direction, with manual override
capability. Extended range companies handled separately.

### X. Bicycle-Optimized Routing

Routes MUST be optimized for bicycle travel, not car navigation. This includes:
preference for bike-friendly roads and paths, avoidance of highways and high-
traffic areas. Routes start and end at the user's home location. Goal is to
minimize total cycling distance while visiting all selected companies in a
cluster (TSP optimization). Calculate total distance and estimated travel time.

### XI. Multi-Format Export

Routes MUST be exportable in multiple formats for field use:

- Interactive map viewable in web browser
- GPS file importable to cycling/navigation apps (GPX format)
- Printable field sheet with company details, addresses, and route order
  All exports MUST work offline once downloaded. Export includes company contact
  info and notes for reference while in the field.

### XII. Field Operations Support

The app MUST support field operations while visiting companies by bicycle.
Printable field sheets with company details for the day's route. Quick status
updates (mark as visited, add notes) that sync when connectivity returns.
Route progress tracking. PWA service worker caches critical data for offline
access. Core route execution MUST NOT require network connectivity.

## Technical Standards

### Framework Requirements

- Next.js 15.5+ with App Router and static export
- React 19+ with TypeScript strict mode
- Tailwind CSS 4 with DaisyUI for theming
- pnpm 10.16.1 as package manager
- Node.js 20+ LTS version

### Testing Standards

- Vitest for unit testing (58%+ coverage target)
- Playwright for E2E testing (40+ test scenarios)
- Pa11y for accessibility testing (WCAG AA)
- Storybook for component documentation
- MSW for API mocking in tests

### Code Quality

- ESLint with Next.js configuration
- Prettier for consistent formatting
- TypeScript strict mode enabled
- Husky pre-commit hooks for validation
- Component structure validation in CI/CD

## Development Workflow

### Sprint Methodology

Sprints follow PRP completion cycles with clear milestones. Technical debt
reduction sprints occur between feature sprints. Each sprint has defined
success metrics and test coverage goals. Sprint constitutions may supersede
this document temporarily for focused work.

### PRP Execution Flow

1. Create PRP document with requirements
2. Run /plan command for technical approach
3. Run /tasks command for task breakdown
4. Implement following generated tasks
5. Validate against PRP success criteria
6. Update PRP status dashboard

### Contribution Process

- Fork repository and use auto-configuration
- Create feature branch following naming convention
- Implement using Docker environment
- Ensure all tests pass before push
- Submit PR with comprehensive description
- Pass all CI/CD checks for merge

## Quality Gates

### Build Requirements

- All components follow 5-file structure
- TypeScript compilation without errors
- Build completes without warnings
- Static export generates successfully
- Bundle size under 150KB first load

### Test Requirements

- Unit test coverage above 25% minimum
- All accessibility tests passing
- E2E tests run successfully locally
- No failing tests in test suite
- Storybook stories render without errors

### Performance Standards

- Lighthouse Performance: 90+ score
- Lighthouse Accessibility: 95+ score
- First Contentful Paint under 2 seconds
- Time to Interactive under 3.5 seconds
- Cumulative Layout Shift under 0.1

### Accessibility Standards

- WCAG 2.1 Level AA compliance
- Keyboard navigation fully functional
- Screen reader compatibility verified
- Color contrast ratios meet standards
- Focus indicators clearly visible

## Governance

### Amendment Procedure

Constitution amendments require documentation of rationale, impact analysis
on existing codebase, migration plan if breaking changes, and approval via
repository discussion. Major version bumps for principle changes, minor for
additions, patch for clarifications.

### Compliance Verification

All pull requests must verify constitutional compliance. CI/CD pipeline
enforces technical standards automatically. Code reviews check principle
adherence. Sprint retrospectives evaluate constitution effectiveness.

### Version Management

Constitution follows semantic versioning. Sprint-specific constitutions may
temporarily override for focused work. All versions archived in spec-kit
directory. Amendments tracked with ratification dates.

### Enforcement

The constitution supersedes all other practices. Violations must be justified
with documented rationale. Temporary exceptions require sprint constitution.
Use CLAUDE.md for runtime development guidance specific to AI assistance.

**Version**: 1.1.0 | **Ratified**: 2025-09-20 | **Last Amended**: 2025-12-04
