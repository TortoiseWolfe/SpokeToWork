# Storybook Setup Notes

## Current Status

Using Storybook 10.2.8 with Next.js 15.5 via `@storybook/nextjs-vite`.

### Key Packages

| Package                   | Version | Purpose                                                                    |
| ------------------------- | ------- | -------------------------------------------------------------------------- |
| `storybook`               | 10.2.8  | Core (includes essentials: Controls, Actions, Viewport, Backgrounds, Docs) |
| `@storybook/nextjs-vite`  | 10.2.8  | Framework integration (Next.js + Vite)                                     |
| `@storybook/addon-themes` | 10.2.8  | DaisyUI theme switcher                                                     |
| `@storybook/addon-a11y`   | 10.2.8  | WCAG accessibility testing                                                 |

### Storybook 10 Consolidation

In v10, many packages were absorbed into the core `storybook` package:

- **Controls, Actions, Viewport, Backgrounds, Docs** — now built into `storybook` (previously `@storybook/addon-essentials`)
- **Test utilities (`fn`, `expect`)** — import from `storybook/test` (previously `@storybook/test`)
- **Story types (`Meta`, `StoryObj`)** — import from `@storybook/nextjs-vite` (previously `@storybook/nextjs`)

## Story Organization

Stories use a hybrid functional + atomic design hierarchy:

**Atomic Design/** — Design complexity hierarchy

- `Atomic Design/Subatomic/` — Primitive building blocks (Text)
- `Atomic Design/Atomic/` — Basic UI components (Button, Card, etc.)
- `Atomic Design/Molecular/` — Composed components (CodeBlock, MessageInput, etc.)
- `Atomic Design/Organism/` — Complex features (DiceTray, etc.)

**Features/** — Functional purpose grouping

- `Features/Authentication/` — Auth components (SignInForm, SignUpForm, etc.)
- `Features/Privacy/` — GDPR compliance (CookieConsent, ConsentModal, etc.)
- `Features/Payment/` — Payment processing (PaymentButton, PaymentHistory, etc.)
- `Features/Map/` — Geolocation (MapContainer, LocationButton, etc.)
- `Features/Blog/` — Blog system (BlogPostCard, BlogContent, etc.)
- `Features/Forms/` — Form components (ContactForm)
- `Features/Calendar/` — Calendar integration (CalendarEmbed)
- `Features/Analytics/` — Tracking (GoogleAnalytics)

**Layout/** — Layout and theming

- `Layout/Theme/` — Theme switching (FontSwitcher, ColorblindToggle, etc.)

### Example Story Titles

```typescript
title: 'Atomic Design/Atomic/Button';
title: 'Atomic Design/Molecular/CodeBlock';
title: 'Features/Authentication/SignInForm';
title: 'Features/Payment/PaymentButton';
title: 'Layout/Theme/FontSwitcher';
```

### When Creating New Components

After using the component generator, update the story `title` field to match the functional category rather than the generated atomic design category.
