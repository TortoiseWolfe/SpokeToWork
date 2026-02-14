# SpokeToWork Design System Redesign

**Date:** 2026-02-13
**Status:** Approved
**Approach:** Design System Build-Out (Approach 3), then Theme-First iteration (Approach 1)

## Design Direction

**Aesthetic:** Mission with personality. Professional foundation with playful touches. The bike/spoke theme adds character without being silly. Reference: Headspace (serious purpose, welcoming design).

**Theme:** Custom DaisyUI theme, dark default with light variant. Built around existing brand colors from the logo and pitch wireframes.

**Brand identity:**

- "SpokeToWork" is a play on words: bicycle spoke + commuting to work + conversation
- Logo: bicycle wheel with curved text, orange job markers radiating outward
- Tagline: "Route Your Job Search"

## Color Palette

### Dark Variant (Default)

| Role               | Color                               | Source                              |
| ------------------ | ----------------------------------- | ----------------------------------- |
| Base               | Navy #0d1f3c / #132a4e              | Pitch wireframes                    |
| Primary            | Orange #E67E22                      | Wheel logo job markers              |
| Secondary          | Cyan #00d9ff                        | Wireframe accents, user location    |
| Accent             | Green #22c55e                       | Success states, positive indicators |
| Neutral            | Grays from existing dark palette    | Current wireframes                  |
| Info/Warning/Error | Standard semantics tuned to palette | —                                   |

### Light Variant

| Role      | Color                                   | Notes                                |
| --------- | --------------------------------------- | ------------------------------------ |
| Base      | Warm white/cream                        | Not clinical white, fits personality |
| Primary   | Orange (adjusted for light bg contrast) | Same hue family                      |
| Secondary | Cyan (adjusted)                         | Same hue family                      |
| Accent    | Green (adjusted)                        | Same hue family                      |

All colors must pass WCAG AA contrast against their respective backgrounds.

## Phases

### Phase 1: Upgrade Storybook to v10

Upgrade from 9.1.5 to 10.x to restore the full addon ecosystem.

- Run `npx storybook@latest upgrade`
- Ensure ESM-only config compatibility (.storybook/main.ts)
- Verify Node 20.19+ requirement
- Re-add addon-essentials (Controls, Actions, Viewport, Backgrounds)
- Remove workarounds documented in STORYBOOK_NOTES.md
- Verify existing 97 stories render
- Standardize story titles to documented structure

### Phase 2: Custom DaisyUI Theme

Build SpokeToWork brand theme with dark and light variants.

- Define theme in tailwind config or globals.css @theme block
- Dark variant as default (navy base, orange primary, cyan secondary, green accent)
- Light variant (warm white base, same brand colors adjusted for contrast)
- Test against WCAG AA for existing accessibility standards
- Storybook theme switcher picks up custom themes automatically

### Phase 3: Redesign Atomic Components

Rebuild foundational components against the new theme.

Priority order:

1. Button - variants, sizes, hover/active states
2. Card - border radius, shadow, spacing
3. Input/Form fields - text inputs, selects, textareas
4. Badge/Tag - job listings, filters, status indicators
5. AnimatedLogo - brand centerpiece on landing page

For each component:

- Update Storybook story with all variants against both themes
- Verify WCAG AA contrast and 44px touch targets
- Add missing stories as needed

Preserve: atomic design hierarchy (subatomic, atomic, molecular, organism layers unchanged).

### Phase 4: Rebuild Molecular & Organism Components

Compose redesigned atoms into polished higher-level components.

High-impact molecules:

- ApplicationRow, CompanyRow (table rows for core list views)
- BlogPostCard (content presentation)
- ConversationListItem, MessageBubble (messaging UI)
- RouteFilter (map interaction)

Organisms:

- GlobalNav (top navigation)
- Footer
- ChatWindow (full messaging experience)
- CompanyTable (data-heavy view)
- RouteBuilder (map-based route planning)

Each reviewed in Storybook against both theme variants before touching pages.

### Phase 5: Page-by-Page Polish

With design system solid, iterate through pages for layout, spacing, composition.

Order:

1. Landing page / hero (first impression, animated logo)
2. Map / job search (core experience, demo-ready)
3. Messages / conversations
4. Auth pages (sign in, sign up, reset)
5. Profile, companies, schedule
6. Blog, docs, status

## Constraints

- Preserve all existing accessibility work (WCAG touch targets, ARIA patterns, colorblind filters, skip links)
- No restructuring of the atomic design hierarchy
- Mobile-first responsive approach stays
- Steady improvement pace, no hard deadline

## Implementation Learnings

### Theme Application

Three places set `data-theme` on the DOM: `ThemeScript.tsx` (inline script, first paint), `GlobalNav.tsx` (useEffect on hydration), `ThemeSwitcher.tsx` (user selection). All three must default to `'spoketowork-dark'`, not `'dark'`. GlobalNav originally defaulted to `'dark'` which caused the built-in DaisyUI dark theme (purple primary, gray background) to override our custom theme on every page load.

DaisyUI's `@plugin "daisyui/theme" { default: true }` sets CSS variables as base-level styles, but `[data-theme="dark"]` selectors from the built-in themes list have higher specificity and override them. The `data-theme` attribute must match the custom theme name exactly.

### Contrast Patterns

- Use `text-base-content/85` instead of `opacity-70` for text dimming. `opacity-XX` dims the entire element (background, borders, text). `text-base-content/XX` only affects text color.
- Colors that serve dual roles (text-on-dark-bg AND background-with-text) need split treatment. Use CSS class overrides for text rendering (e.g., `[data-theme='spoketowork-dark'] .text-error { color: oklch(78% ...) }`) and dark `-content` values for background usage (e.g., `--color-primary-content: oklch(20% ...)`).
- The automated 590-story axe-core audit found 30 contrast issues. 16 were fixed, 14 remaining are intentional (4 inactive row dimming at AA level, 10 AAA-only edge cases).

### Playwright Auditing

- Set `colorScheme: 'dark'` in `browser.newPage()` options to trigger the correct theme via ThemeScript's `prefers-color-scheme` media query.
- Inject axe-core via `page.addScriptTag({ content: AXE_SOURCE })` for per-page contrast checks.
- Use `Promise.race` with timeouts for map/heavy components that may hang during evaluation.
- Page audit script: `tests/e2e/audit-pages.mjs`. Storybook audit: `tests/e2e/storybook-audit.spec.ts`.

### Button Personality

Hover lift (`translateY(-1px)`), active press (`scale(0.97)`), and branded focus ring (`outline: 2px solid oklch(79.5% 0.145 55.5)`) are defined in `globals.css` CSS rules scoped to `[data-theme='spoketowork-dark']` and `[data-theme='spoketowork-light']`, not in the Button component itself. This keeps the Button component clean and theme-agnostic.

## Completion Status

**Status:** Complete (2026-02-14)

| Phase                             | Status   | Key Commits          |
| --------------------------------- | -------- | -------------------- |
| Phase 1: Storybook v10            | Complete | `20cd992`, `3a3de99` |
| Phase 2: Custom Theme             | Complete | `d45e5ad`, `c13e892` |
| Phase 3: Atomic Components        | Complete | `999f254`            |
| Phase 4: Molecular/Organism Audit | Complete | `83741fb`            |
| Phase 5: Page Polish              | Complete | `971971c`            |

## Pre-Implementation State Reference

- Framework: Next.js 15.5, React 19, TypeScript
- Styling: Tailwind v4 + DaisyUI (beta), 32 stock themes available
- Components: ~216 total, 97 with Storybook stories (45% coverage)
- Storybook: 9.1.5, missing addon-essentials due to v8/v9 incompatibility
- Strong a11y foundation: WCAG touch targets, ARIA listbox, colorblind filters, skip links
