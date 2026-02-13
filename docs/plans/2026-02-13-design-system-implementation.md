# Design System Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Storybook to v10, build a custom SpokeToWork DaisyUI theme (dark default + light variant), then redesign atomic components with the new brand identity.

**Architecture:** Custom DaisyUI theme defined in `globals.css` via `@plugin "daisyui"` block (Tailwind v4 CSS-first config). Storybook upgraded to v10 for full addon support. Components reskinned bottom-up: atoms first, then molecules/organisms, then pages.

**Tech Stack:** Next.js 15.5, React 19, Tailwind v4, DaisyUI beta, Storybook 10, pnpm, Docker Compose

**Important:** SpokeToWork runs inside Docker. All pnpm/storybook commands run via `docker compose exec spoketowork <command>` unless noted otherwise.

---

## Phase 1: Upgrade Storybook to v10

### Task 1: Check current Storybook state

**Files:**

- Read: `package.json`
- Read: `.storybook/main.ts`
- Read: `docs/STORYBOOK_NOTES.md`

**Step 1: Verify Node version inside Docker**

Run: `docker compose exec spoketowork node --version`
Expected: v22.x (meets Storybook 10 requirement of 20.19+)

**Step 2: Verify current Storybook version**

Run: `docker compose exec spoketowork npx storybook --version`
Expected: 9.1.x

**Step 3: Check which stories currently render**

Run: `docker compose exec spoketowork npx storybook build --test 2>&1 | tail -30`
Expected: Build output showing which stories compile. Note any failures.

---

### Task 2: Upgrade Storybook to v10

**Files:**

- Modify: `package.json` (dependencies updated by upgrade command)
- Modify: `.storybook/main.ts` (automigrations may update config)
- Modify: `.storybook/preview.tsx` (automigrations may update config)

**Step 1: Run the Storybook upgrade**

Run: `docker compose exec spoketowork npx storybook@latest upgrade`
Expected: Interactive prompts for automigrations. Accept all recommended changes.

**Step 2: Verify the upgrade**

Run: `docker compose exec spoketowork npx storybook --version`
Expected: 10.x

**Step 3: Install any new dependencies**

Run: `docker compose exec spoketowork pnpm install`
Expected: Clean install with no peer dependency errors

**Step 4: Commit the upgrade**

```bash
cd ~/repos/SpokeToWork
git add package.json pnpm-lock.yaml .storybook/
git commit -m "chore: upgrade Storybook from 9.1.5 to 10.x"
```

---

### Task 3: Re-add addon-essentials

**Files:**

- Modify: `.storybook/main.ts` (add addon-essentials to addons array)
- Modify: `package.json` (if not already added by upgrade)

**Step 1: Check if addon-essentials was added by the upgrade**

Run: `docker compose exec spoketowork grep -r "addon-essentials" .storybook/main.ts`
Expected: Either found (upgrade added it) or not found (need to add manually)

**Step 2: If not present, add addon-essentials**

In `.storybook/main.ts`, replace the addons array:

```typescript
addons: [
  '@storybook/addon-essentials',
  '@storybook/addon-a11y',
  '@storybook/addon-themes',
  '@storybook/addon-links',
],
```

Remove `@storybook/addon-onboarding`, `@storybook/addon-docs`, and `@chromatic-com/storybook` since essentials includes docs and the others are optional.

**Step 3: Install addon-essentials if needed**

Run: `docker compose exec spoketowork pnpm add -D @storybook/addon-essentials`

**Step 4: Verify Storybook starts**

Run: `docker compose exec spoketowork npx storybook build --test 2>&1 | tail -30`
Expected: Clean build with no addon errors

**Step 5: Commit**

```bash
cd ~/repos/SpokeToWork
git add .storybook/ package.json pnpm-lock.yaml
git commit -m "chore: re-add addon-essentials (Controls, Actions, Viewport)"
```

---

### Task 4: Fix @storybook/test

**Files:**

- Modify: `package.json` (update @storybook/test version)

**Step 1: Check current version**

Run: `docker compose exec spoketowork pnpm list @storybook/test`
Expected: 9.0.0-alpha.2

**Step 2: Upgrade to stable**

Run: `docker compose exec spoketowork pnpm add -D @storybook/test@latest`

**Step 3: Verify stories that use `fn()` still compile**

Run: `docker compose exec spoketowork npx storybook build --test 2>&1 | tail -30`
Expected: Clean build (82 stories import `fn` from `@storybook/test`)

**Step 4: Commit**

```bash
cd ~/repos/SpokeToWork
git add package.json pnpm-lock.yaml
git commit -m "chore: upgrade @storybook/test from alpha to stable"
```

---

### Task 5: Update STORYBOOK_NOTES.md

**Files:**

- Modify: `docs/STORYBOOK_NOTES.md`

**Step 1: Update the doc to reflect v10 state**

Replace the "Temporarily Removed Packages" section with current status. Remove workarounds that are no longer needed. Update the version references.

**Step 2: Commit**

```bash
cd ~/repos/SpokeToWork
git add docs/STORYBOOK_NOTES.md
git commit -m "docs: update Storybook notes for v10 upgrade"
```

---

### Task 6: Verify all 97 stories render

**Files:**

- Various: `src/**/*.stories.tsx` (fix any broken stories)

**Step 1: Run a full Storybook build**

Run: `docker compose exec spoketowork npx storybook build --test 2>&1`
Expected: All stories compile. Note any failures.

**Step 2: Fix any broken stories**

Address compilation errors one by one. Common issues after major upgrades:

- Import path changes
- Removed/renamed APIs
- Type mismatches with new Meta/StoryObj generics

**Step 3: Commit fixes**

```bash
cd ~/repos/SpokeToWork
git add src/
git commit -m "fix: resolve story compilation errors after Storybook v10 upgrade"
```

---

## Phase 2: Custom DaisyUI Theme

### Task 7: Research DaisyUI custom theme syntax for Tailwind v4

**Files:**

- Read: `src/app/globals.css` (current `@plugin "daisyui"` block)
- Read: DaisyUI docs for custom theme CSS syntax

**Step 1: Check DaisyUI version**

Run: `docker compose exec spoketowork pnpm list daisyui`
Expected: beta version

**Step 2: Research custom theme syntax**

Check the DaisyUI v5 docs for how to define custom themes with the `@plugin` CSS-first syntax. The current config is:

```css
@plugin "daisyui" {
  themes: light, dark, cupcake, ...;
}
```

Custom themes in DaisyUI v5 use CSS custom properties. Research the exact syntax for defining a custom theme inline or via a separate CSS block.

**Step 3: Document findings**

Note the exact syntax needed for Task 8.

---

### Task 8: Define spoketowork-dark theme

**Files:**

- Modify: `src/app/globals.css`

**Step 1: Add custom theme CSS**

After the `@plugin "daisyui"` block, add the custom dark theme. Colors from the approved design:

```css
[data-theme='spoketowork-dark'] {
  --color-base-100: #132a4e; /* Navy - primary surface */
  --color-base-200: #0d1f3c; /* Darker navy - secondary surface */
  --color-base-300: #1a365d; /* Lighter navy - borders/dividers */
  --color-base-content: #e0f2fe; /* Light blue-white text */

  --color-primary: #e67e22; /* Orange - from wheel logo */
  --color-primary-content: #ffffff;

  --color-secondary: #00d9ff; /* Cyan - wireframe accents */
  --color-secondary-content: #0d1f3c;

  --color-accent: #22c55e; /* Green - success/positive */
  --color-accent-content: #ffffff;

  --color-neutral: #1f2937; /* Dark gray */
  --color-neutral-content: #d1d5db;

  --color-info: #3b82f6;
  --color-success: #22c55e;
  --color-warning: #fde047;
  --color-error: #ef4444;
}
```

Note: Exact DaisyUI v5 CSS custom property names may differ. Verify against docs in Task 7.

**Step 2: Update the `@plugin` block to include custom theme**

```css
@plugin "daisyui" {
  themes: spoketowork-dark, spoketowork-light, light, dark;
}
```

**Step 3: Verify the theme renders**

Run: `docker compose exec spoketowork pnpm run build`
Expected: Clean build with no CSS errors

**Step 4: Commit**

```bash
cd ~/repos/SpokeToWork
git add src/app/globals.css
git commit -m "feat: add spoketowork-dark custom DaisyUI theme"
```

---

### Task 9: Define spoketowork-light theme

**Files:**

- Modify: `src/app/globals.css`

**Step 1: Add light variant**

```css
[data-theme='spoketowork-light'] {
  --color-base-100: #faf8f5; /* Warm white/cream */
  --color-base-200: #f0ece6; /* Slightly darker cream */
  --color-base-300: #e2ddd5; /* Borders */
  --color-base-content: #1f2937; /* Dark text */

  --color-primary: #d35400; /* Darker orange for contrast on light bg */
  --color-primary-content: #ffffff;

  --color-secondary: #0891b2; /* Darker cyan for light bg contrast */
  --color-secondary-content: #ffffff;

  --color-accent: #16a34a; /* Darker green for light bg */
  --color-accent-content: #ffffff;

  --color-neutral: #374151;
  --color-neutral-content: #f9fafb;

  --color-info: #2563eb;
  --color-success: #16a34a;
  --color-warning: #ca8a04;
  --color-error: #dc2626;
}
```

**Step 2: Verify WCAG AA contrast**

Check that primary, secondary, and accent colors meet 4.5:1 contrast ratio against their respective base colors. Adjust if needed.

**Step 3: Verify build**

Run: `docker compose exec spoketowork pnpm run build`
Expected: Clean build

**Step 4: Commit**

```bash
cd ~/repos/SpokeToWork
git add src/app/globals.css
git commit -m "feat: add spoketowork-light custom DaisyUI theme"
```

---

### Task 10: Set dark theme as default

**Files:**

- Modify: `src/components/ThemeScript.tsx` (change default from 'light' to 'spoketowork-dark')
- Modify: `.storybook/preview.tsx` (add custom themes to switcher, set default)

**Step 1: Update ThemeScript default**

In `src/components/ThemeScript.tsx`, change the fallback theme from `'light'` to `'spoketowork-dark'`.

**Step 2: Update Storybook theme switcher**

In `.storybook/preview.tsx`, add custom themes to the `withThemeByDataAttribute` config:

```typescript
themes: {
  'spoketowork-dark': 'spoketowork-dark',
  'spoketowork-light': 'spoketowork-light',
  light: 'light',
  dark: 'dark',
  // ... keep other themes
},
defaultTheme: 'spoketowork-dark',
```

**Step 3: Verify Storybook renders with new default**

Run: `docker compose exec spoketowork npx storybook build --test 2>&1 | tail -10`
Expected: Clean build

**Step 4: Commit**

```bash
cd ~/repos/SpokeToWork
git add src/components/ThemeScript.tsx .storybook/preview.tsx
git commit -m "feat: set spoketowork-dark as default theme"
```

---

### Task 11: Update MapLibre dark theme selectors

**Files:**

- Modify: `src/app/globals.css` (update dark theme CSS selectors for map controls)

**Step 1: Add spoketowork-dark to map control selectors**

The existing CSS has selectors like `[data-theme='dark'] .maplibregl-ctrl-group`. Add `[data-theme='spoketowork-dark']` to each group of dark theme selectors for both MapLibre and Leaflet controls.

**Step 2: Verify build**

Run: `docker compose exec spoketowork pnpm run build`

**Step 3: Commit**

```bash
cd ~/repos/SpokeToWork
git add src/app/globals.css
git commit -m "fix: add spoketowork-dark to map control dark theme selectors"
```

---

## Phase 3: Redesign Atomic Components

### Task 12: Audit Button component in Storybook

**Files:**

- Read: `src/components/atomic/Button/Button.tsx`
- Read: `src/components/atomic/Button/Button.stories.tsx`

**Step 1: Start Storybook**

Run: `docker compose exec spoketowork npx storybook dev -p 6006 --no-open`

**Step 2: Review Button in both themes**

Open `http://localhost:6006` and switch between spoketowork-dark and spoketowork-light themes. Document what needs to change:

- Do variant colors look right with the new palette?
- Are hover/active/focus states visible and accessible?
- Does the loading spinner contrast work?
- Any personality touches to add (border radius, subtle transitions)?

**Step 3: Document findings for Task 13**

---

### Task 13: Update Button component

**Files:**

- Modify: `src/components/atomic/Button/Button.tsx`
- Modify: `src/components/atomic/Button/Button.stories.tsx`

**Step 1: Update the story to show all variants against both custom themes**

Add a "Theme Comparison" story that renders all button variants in a grid, showing how they look on both spoketowork-dark and spoketowork-light.

**Step 2: Apply design changes**

Based on Task 12 audit findings. Possible changes:

- Adjust border radius for more personality (rounded-full vs rounded-lg)
- Add subtle hover transitions
- Ensure all variants work with new palette

**Step 3: Run accessibility check**

Verify WCAG AA contrast for all variant+theme combinations.

**Step 4: Commit**

```bash
cd ~/repos/SpokeToWork
git add src/components/atomic/Button/
git commit -m "style: update Button component for SpokeToWork theme"
```

---

### Task 14: Audit and update Card component

**Files:**

- Modify: `src/components/atomic/Card/Card.tsx`
- Modify: `src/components/atomic/Card/Card.stories.tsx`

**Step 1: Review Card in Storybook against both themes**

Check shadow, border, background, and text contrast. Cards are used everywhere (job cards, blog cards, company cards) so this is high-impact.

**Step 2: Apply design changes**

Based on audit. Possible changes:

- Shadow intensity and color for dark vs light themes
- Border treatment (subtle glow on dark, soft shadow on light)
- Background differentiation from base (base-200 vs base-100)

**Step 3: Update story with all variants**

**Step 4: Commit**

```bash
cd ~/repos/SpokeToWork
git add src/components/atomic/Card/
git commit -m "style: update Card component for SpokeToWork theme"
```

---

### Task 15-17: Repeat for Input, Badge, AnimatedLogo

Follow the same audit-then-update pattern for:

- **Task 15:** Input/form field components
- **Task 16:** Badge/Tag components
- **Task 17:** AnimatedLogo (the wheel spinner on the landing page)

Each task: audit in Storybook, apply changes, verify a11y, commit.

---

## Phase 4: Molecular & Organism Components

Tasks 18+ follow the same pattern for higher-level components:

- ApplicationRow, CompanyRow
- BlogPostCard
- ConversationListItem, MessageBubble
- GlobalNav, Footer
- ChatWindow, CompanyTable, RouteBuilder

Each audited in Storybook, updated, verified, committed.

---

## Phase 5: Page-by-Page Polish

Tasks 25+ iterate through pages:

1. Landing page / hero
2. Map / job search
3. Messages / conversations
4. Auth pages
5. Profile, companies, schedule
6. Blog, docs, status

Each page reviewed in browser, adjusted for layout/spacing/composition, committed.

---

## Notes

- Phases 3-5 are intentionally less detailed because each task depends on visual audit findings from the previous step. The pattern is consistent: audit, update, verify a11y, commit.
- This plan covers ~25-30 discrete tasks. Each is a single session of focused work.
- The Storybook upgrade (Phase 1) is a prerequisite for everything else. Don't start Phase 2 until Storybook is verified working.
- DaisyUI custom theme CSS property names may need adjustment based on the exact beta version installed. Task 7 handles this research.
