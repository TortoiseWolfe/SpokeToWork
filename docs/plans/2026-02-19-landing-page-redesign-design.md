# Landing Page Redesign Design

**Date:** 2026-02-19
**Status:** Approved
**Scope:** Landing page only (part of the broader Employer Redesign)

## Context

The landing page looks like a stock DaisyUI template. Emoji icons on feature cards, a text-only hero with no visual weight beyond the spinning wheel, and CTAs ("Read Blog", "Browse Themes") that don't drive product adoption. The design system redesign (2026-02-13) established brand colors and theme infrastructure, but the landing page hasn't been reskinned to match the "mission with personality" aesthetic.

## Design Decisions

### Primary CTAs

- **"Get Started"** (sign up) — `btn-primary`
- **"Try the Map"** (explore without account) — `btn-secondary btn-outline`
- **Removed:** "Read Blog", "Browse Themes"

### Feature Card Icons

- Isometric/3D-style SVG illustrations using brand colors
- Inline SVG components that inherit theme colors via CSS variables
- Adapt to all 32+ DaisyUI themes automatically

### Art Style

- Isometric perspective with depth
- Brand palette: orange (primary), cyan (secondary), green (accent), navy (base)
- "Headspace-like: serious purpose, welcoming design"

## Page Structure

```
src/app/page.tsx (thin orchestrator, <50 lines)
  ├── HeroSection      — Visual anchor + primary CTAs
  ├── FeaturesSection   — 4 isometric illustration cards
  ├── HowItWorksSection — 3-step numbered flow
  └── CTAFooter         — Final sign-up push
```

### New Components (5-file pattern each)

```
src/components/organisms/Landing/
  ├── HeroSection/
  ├── FeaturesSection/
  ├── HowItWorksSection/
  └── CTAFooter/
```

## Section Details

### 1. Hero Section

**Layout:** Split — illustration left, text right. Stacks vertically on mobile.

- **Left:** Existing `LayeredSpokeToWorkLogo` (spinning wheel) with enhanced shadow/glow
- **Right:**
  - Tagline: "Route Your Job Search" — large, bold
  - Subtitle: "Plan bicycle routes, track applications, land the job."
  - CTAs: "Get Started" (primary) + "Try the Map" (secondary outline)
  - Feature badges (hidden <428px): "Track Applications", "Route Planning", "Offline Ready", "Mobile First"
- **Background:** Gradient `from-base-200 via-base-100 to-base-200`

### 2. Features Section

**Layout:** 4 cards, responsive grid (1→2→4 columns).

| Card | Isometric Illustration              | Title           | Description                     | Link         |
| ---- | ----------------------------------- | --------------- | ------------------------------- | ------------ |
| 1    | Desk with laptop + pinned map       | Track Companies | Log applications and follow-ups | `/companies` |
| 2    | **Bicycle on route with waypoints** | Plan Routes     | Optimize your job hunt by bike  | `/map`       |
| 3    | Calendar with clock                 | Schedule Visits | Book interviews and follow-ups  | `/schedule`  |
| 4    | Chat bubbles with phone             | Stay Connected  | Message recruiters and contacts | `/messages`  |

**Visual priority:** "Plan Routes" card is visually distinguished (larger, accent border, or different background) as the app's differentiator.

### 3. How It Works Section

**Layout:** 3 horizontal steps with connecting lines (vertical stack on mobile).

1. **Sign Up** — User + checkmark icon — "Create your account"
2. **Add Companies** — Building + list icon — "Track where you've applied"
3. **Plan Your Route** — Map + bicycle icon — "Generate an optimized bicycle route"

Numbered circles: `bg-primary text-primary-content`. Connecting lines: `border-base-300`.

### 4. CTA Footer

- Headline: "Ready to ride?"
- Subtitle: "Start planning your job search route today."
- CTA: "Get Started" — `btn-primary btn-lg`
- Background: `bg-base-200` for visual separation

## Constraints

- ALL colors use DaisyUI semantic tokens — zero hardcoded hex
- Verify against 3 themes: spoketowork-dark, spoketowork-light, dracula
- Preserve: skip-to-content link, font scaling toolbar, colorblind filters, 44px touch targets
- Pages under 150 lines (use component extraction)
- Use component generator for new components
- Isometric SVGs as inline React components (not external files) for theme adaptability

## Alternative Approaches (Documented for Future Reference)

### Approach A: Hero-Focused Overhaul

Rework only the hero section and feature cards. Keep existing page structure. Swap CTAs, add isometric SVGs, enhance visual weight. Minimal component extraction.

- **Pros:** Fastest, least risk
- **Cons:** Layout/hierarchy unchanged, may still feel template-ish
- **When to use:** If Approach C proves too ambitious or the result feels overdesigned

### Approach B: Progressive Enhancement

Keep the existing page largely intact. Swap CTAs, replace emoji with illustrations, add subtle background pattern. No new sections.

- **Pros:** Fastest to ship, minimal disruption
- **Cons:** Least transformative — addresses symptoms not root cause
- **When to use:** If we need a quick win before tackling larger redesign

### Chosen: Approach C — Full Multi-Section Rebuild

Multi-section marketing page: Hero → Features → How It Works → CTA Footer. Each section gets its own component and visual treatment.

- **Pros:** Most visually impressive, distinctive identity, proper information hierarchy
- **Cons:** Highest effort, scope risk
- **Mitigation:** Sections are independent components — can ship incrementally

## Verification

1. Visual: Page renders correctly in spoketowork-dark, spoketowork-light, and dracula themes
2. Accessibility: `docker compose exec spoketowork pnpm run test:a11y` passes
3. Component tests: All new components have unit + accessibility tests
4. Storybook: Each section has stories showing different theme states
5. Mobile: Responsive layout verified at 390px, 768px, 1024px breakpoints
6. Existing features: Skip-to-content, font scaling, colorblind filters all still work
