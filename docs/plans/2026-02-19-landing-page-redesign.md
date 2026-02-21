# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the landing page from a stock DaisyUI template into a distinctive multi-section marketing page with isometric illustrations, proper CTAs, and clear information hierarchy.

**Architecture:** Extract the monolithic 310-line `page.tsx` into 4 organism components (HeroSection, FeaturesSection, HowItWorksSection, CTAFooter) plus 4 inline SVG illustration components. The page itself becomes a thin ~40-line orchestrator. All colors use DaisyUI semantic tokens for theme compatibility.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4, DaisyUI, inline SVG components, Vitest + React Testing Library + jest-axe, Storybook v10

**Design doc:** `docs/plans/2026-02-19-landing-page-redesign-design.md`

---

## Task 1: Create HeroSection Component

**Files:**
- Create: `src/components/organisms/HeroSection/index.tsx`
- Create: `src/components/organisms/HeroSection/HeroSection.tsx`
- Create: `src/components/organisms/HeroSection/HeroSection.test.tsx`
- Create: `src/components/organisms/HeroSection/HeroSection.stories.tsx`
- Create: `src/components/organisms/HeroSection/HeroSection.accessibility.test.tsx`

**Step 1: Generate component scaffold**

Run: `docker compose exec spoketowork pnpm run generate:component`
Answers: Name=`HeroSection`, Category=`organisms`, Props=`yes`, Hooks=`no`

**Step 2: Write the failing test**

Replace generated test with:

```tsx
// HeroSection.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroSection from './HeroSection';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock logo components
vi.mock('@/components/atomic/SpinningLogo', () => ({
  LayeredSpokeToWorkLogo: () => <div data-testid="spinning-logo">Logo</div>,
}));
vi.mock('@/components/atomic/AnimatedLogo', () => ({
  AnimatedLogo: ({ text }: { text: string }) => <span>{text}</span>,
}));

describe('HeroSection', () => {
  it('renders the tagline', () => {
    render(<HeroSection />);
    expect(screen.getByText(/route your job search/i)).toBeInTheDocument();
  });

  it('renders Get Started CTA linking to sign-up', () => {
    render(<HeroSection />);
    const cta = screen.getByRole('link', { name: /get started/i });
    expect(cta).toHaveAttribute('href', '/sign-up');
  });

  it('renders Try the Map CTA linking to map', () => {
    render(<HeroSection />);
    const cta = screen.getByRole('link', { name: /try the map/i });
    expect(cta).toHaveAttribute('href', '/map');
  });

  it('renders the spinning logo', () => {
    render(<HeroSection />);
    expect(screen.getByTestId('spinning-logo')).toBeInTheDocument();
  });

  it('has a primary navigation region', () => {
    render(<HeroSection />);
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });

  it('renders feature badges on larger screens', () => {
    render(<HeroSection />);
    expect(screen.getByText('Track Applications')).toBeInTheDocument();
    expect(screen.getByText('Route Planning')).toBeInTheDocument();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `docker compose exec spoketowork pnpm exec vitest run src/components/organisms/HeroSection/HeroSection.test.tsx`
Expected: FAIL

**Step 4: Implement HeroSection**

```tsx
// HeroSection.tsx
'use client';

import Link from 'next/link';
import { LayeredSpokeToWorkLogo } from '@/components/atomic/SpinningLogo';
import { AnimatedLogo } from '@/components/atomic/AnimatedLogo';
import { detectedConfig } from '@/config/project-detected';

export interface HeroSectionProps {
  className?: string;
}

export default function HeroSection({ className = '' }: HeroSectionProps) {
  return (
    <section
      id="main-content"
      aria-label="Welcome hero"
      className={`hero relative flex-1 ${className}`}
    >
      <div className="hero-content px-4 py-6 sm:px-6 sm:py-8 md:py-10 lg:px-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="h-64 w-64 sm:h-72 sm:w-72 md:h-80 md:w-80 lg:h-[450px] lg:w-[450px]">
              <LayeredSpokeToWorkLogo speed="slow" pauseOnHover />
            </div>
          </div>

          {/* Content */}
          <div className="max-w-full px-6 text-center sm:max-w-2xl sm:px-6 lg:max-w-4xl lg:px-0 lg:text-left">
            <h1 className="mb-4 sm:mb-6">
              <AnimatedLogo
                text={detectedConfig.projectName}
                className="!text-lg font-bold min-[400px]:!text-xl min-[480px]:!text-2xl sm:!text-5xl md:!text-6xl lg:!text-7xl"
                animationSpeed="normal"
              />
            </h1>

            <p className="text-base-content mb-2 text-2xl leading-relaxed font-bold sm:text-3xl md:text-4xl">
              Route Your Job Search
            </p>
            <p className="text-base-content/85 mb-6 text-base leading-relaxed sm:text-xl">
              Plan bicycle routes, track applications, land the job.
            </p>

            {/* Feature badges */}
            <div
              className="mb-8 hidden flex-wrap justify-center gap-2 sm:flex lg:justify-start"
              role="list"
              aria-label="Key features"
            >
              {['Track Applications', 'Route Planning', 'Offline Ready', 'Mobile First'].map((feature) => (
                <span key={feature} role="listitem" className="badge badge-outline badge-sm sm:badge-md">
                  {feature}
                </span>
              ))}
            </div>

            {/* Primary CTAs */}
            <nav
              aria-label="Primary navigation"
              className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
            >
              <Link
                href="/sign-up"
                className="btn btn-primary btn-md md:btn-lg min-h-11 w-full min-w-11 sm:w-auto"
              >
                Get Started
              </Link>
              <Link
                href="/map"
                className="btn btn-secondary btn-outline btn-md md:btn-lg min-h-11 w-full min-w-11 sm:w-auto"
              >
                Try the Map
              </Link>
            </nav>

            {/* Secondary links */}
            <nav
              aria-label="Secondary navigation"
              className="mt-8 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 lg:justify-start"
            >
              {[
                { href: '/companies', label: 'Companies' },
                { href: '/blog', label: 'Blog' },
                { href: '/schedule', label: 'Schedule' },
                { href: '/contact', label: 'Contact' },
              ].map((link, i) => (
                <span key={link.href} className="contents">
                  {i > 0 && <span className="hidden opacity-30 sm:inline" aria-hidden="true">•</span>}
                  <Link href={link.href} className="link link-hover opacity-87 hover:opacity-100 focus:opacity-100">
                    {link.label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 5: Run test to verify it passes**

Run: `docker compose exec spoketowork pnpm exec vitest run src/components/organisms/HeroSection/HeroSection.test.tsx`
Expected: PASS

**Step 6: Write accessibility test**

```tsx
// HeroSection.accessibility.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import HeroSection from './HeroSection';

expect.extend(toHaveNoViolations);

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('@/components/atomic/SpinningLogo', () => ({
  LayeredSpokeToWorkLogo: () => <div data-testid="spinning-logo">Logo</div>,
}));
vi.mock('@/components/atomic/AnimatedLogo', () => ({
  AnimatedLogo: ({ text }: { text: string }) => <span>{text}</span>,
}));

describe('HeroSection Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<HeroSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has landmark region with label', () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector('section[aria-label="Welcome hero"]');
    expect(section).toBeInTheDocument();
  });
});
```

**Step 7: Run accessibility test**

Run: `docker compose exec spoketowork pnpm exec vitest run src/components/organisms/HeroSection/HeroSection.accessibility.test.tsx`
Expected: PASS

**Step 8: Write Storybook story**

```tsx
// HeroSection.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HeroSection from './HeroSection';

const meta = {
  title: 'Atomic Design/Organism/HeroSection',
  component: HeroSection,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithClassName: Story = {
  args: { className: 'bg-base-200' },
};
```

**Step 9: Update barrel export**

```tsx
// index.tsx
export { default } from './HeroSection';
export type { HeroSectionProps } from './HeroSection';
```

**Step 10: Commit**

```bash
git add src/components/organisms/HeroSection/
git commit -m "feat: add HeroSection component with tests and stories"
```

---

## Task 2: Create Isometric SVG Illustration Components

**Files:**
- Create: `src/components/atomic/illustrations/IsometricDesk.tsx`
- Create: `src/components/atomic/illustrations/IsometricBicycle.tsx`
- Create: `src/components/atomic/illustrations/IsometricCalendar.tsx`
- Create: `src/components/atomic/illustrations/IsometricChat.tsx`
- Create: `src/components/atomic/illustrations/index.tsx`

These are presentational SVG components — no 5-file pattern needed since they're pure illustrations with no logic. They use `currentColor` and CSS variables to adapt to themes.

**Step 1: Create IsometricDesk (Track Companies)**

```tsx
// IsometricDesk.tsx
export interface IllustrationProps {
  className?: string;
  'aria-hidden'?: boolean;
}

export function IsometricDesk({ className = 'h-24 w-24', ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Isometric desk surface */}
      <path d="M60 30L100 50L60 70L20 50Z" className="fill-base-300 stroke-base-content/20" strokeWidth="1" />
      {/* Desk legs */}
      <path d="M20 50L20 80" className="stroke-base-content/30" strokeWidth="2" />
      <path d="M100 50L100 80" className="stroke-base-content/30" strokeWidth="2" />
      {/* Laptop body */}
      <path d="M45 35L75 35L75 50L45 50Z" className="fill-primary/20 stroke-primary" strokeWidth="1.5" transform="skewY(-10) translate(0, 8)" />
      {/* Laptop screen */}
      <rect x="48" y="28" width="24" height="16" rx="1" className="fill-primary/10 stroke-primary" strokeWidth="1" transform="skewY(-10) translate(0, 8)" />
      {/* Map pin */}
      <circle cx="85" cy="38" r="4" className="fill-accent" />
      <path d="M85 42L85 48" className="stroke-accent" strokeWidth="2" />
      {/* Document stack */}
      <rect x="30" y="38" width="12" height="8" rx="1" className="fill-secondary/20 stroke-secondary/50" strokeWidth="1" transform="skewY(-10)" />
    </svg>
  );
}
```

**Step 2: Create IsometricBicycle (Plan Routes)**

```tsx
// IsometricBicycle.tsx
import type { IllustrationProps } from './IsometricDesk';

export function IsometricBicycle({ className = 'h-24 w-24', ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Road/path */}
      <path d="M10 85Q40 70 60 75Q80 80 110 65" className="stroke-base-content/20" strokeWidth="3" strokeDasharray="6 3" />
      {/* Back wheel */}
      <circle cx="35" cy="70" r="14" className="stroke-secondary" strokeWidth="2" fill="none" />
      <circle cx="35" cy="70" r="2" className="fill-secondary" />
      {/* Front wheel */}
      <circle cx="75" cy="65" r="14" className="stroke-secondary" strokeWidth="2" fill="none" />
      <circle cx="75" cy="65" r="2" className="fill-secondary" />
      {/* Frame */}
      <path d="M35 70L55 50L75 65L55 50L35 70" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Handlebars */}
      <path d="M55 50L60 45L68 47" className="stroke-primary" strokeWidth="2" />
      {/* Seat */}
      <path d="M45 48L55 50" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
      {/* Route waypoints */}
      <circle cx="15" cy="85" r="4" className="fill-accent" />
      <circle cx="60" cy="75" r="3" className="fill-accent/60" />
      <circle cx="105" cy="65" r="4" className="fill-accent" />
    </svg>
  );
}
```

**Step 3: Create IsometricCalendar (Schedule Visits)**

```tsx
// IsometricCalendar.tsx
import type { IllustrationProps } from './IsometricDesk';

export function IsometricCalendar({ className = 'h-24 w-24', ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Calendar body - isometric */}
      <path d="M30 35L90 35L90 90L30 90Z" rx="4" className="fill-base-200 stroke-base-content/20" strokeWidth="1.5" />
      {/* Header bar */}
      <path d="M30 35L90 35L90 50L30 50Z" className="fill-primary/20 stroke-primary/40" strokeWidth="1" />
      {/* Calendar rings */}
      <rect x="42" y="30" width="4" height="12" rx="2" className="fill-base-content/30" />
      <rect x="62" y="30" width="4" height="12" rx="2" className="fill-base-content/30" />
      {/* Grid lines */}
      <line x1="50" y1="50" x2="50" y2="90" className="stroke-base-content/10" strokeWidth="1" />
      <line x1="70" y1="50" x2="70" y2="90" className="stroke-base-content/10" strokeWidth="1" />
      <line x1="30" y1="63" x2="90" y2="63" className="stroke-base-content/10" strokeWidth="1" />
      <line x1="30" y1="76" x2="90" y2="76" className="stroke-base-content/10" strokeWidth="1" />
      {/* Highlighted date */}
      <rect x="52" y="65" width="16" height="10" rx="2" className="fill-accent/30 stroke-accent" strokeWidth="1" />
      {/* Clock */}
      <circle cx="95" cy="80" r="12" className="fill-base-100 stroke-secondary" strokeWidth="1.5" />
      <line x1="95" y1="80" x2="95" y2="72" className="stroke-secondary" strokeWidth="2" strokeLinecap="round" />
      <line x1="95" y1="80" x2="101" y2="83" className="stroke-secondary" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
```

**Step 4: Create IsometricChat (Stay Connected)**

```tsx
// IsometricChat.tsx
import type { IllustrationProps } from './IsometricDesk';

export function IsometricChat({ className = 'h-24 w-24', ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden={props['aria-hidden'] ?? true}>
      {/* Phone body */}
      <rect x="35" y="25" width="35" height="65" rx="5" className="fill-base-200 stroke-base-content/20" strokeWidth="1.5" />
      {/* Phone screen */}
      <rect x="38" y="32" width="29" height="50" rx="2" className="fill-base-300/50" />
      {/* Chat bubble 1 (received) */}
      <rect x="15" y="38" width="28" height="14" rx="4" className="fill-secondary/20 stroke-secondary" strokeWidth="1" />
      <path d="M35 52L40 48L35 48Z" className="fill-secondary/20 stroke-secondary" strokeWidth="1" />
      {/* Chat bubble text lines */}
      <line x1="19" y1="43" x2="35" y2="43" className="stroke-secondary/50" strokeWidth="2" strokeLinecap="round" />
      <line x1="19" y1="48" x2="30" y2="48" className="stroke-secondary/50" strokeWidth="2" strokeLinecap="round" />
      {/* Chat bubble 2 (sent) */}
      <rect x="72" y="55" width="28" height="14" rx="4" className="fill-primary/20 stroke-primary" strokeWidth="1" />
      <path d="M72 69L67 65L72 65Z" className="fill-primary/20 stroke-primary" strokeWidth="1" />
      {/* Chat bubble 2 text */}
      <line x1="76" y1="60" x2="92" y2="60" className="stroke-primary/50" strokeWidth="2" strokeLinecap="round" />
      <line x1="76" y1="65" x2="88" y2="65" className="stroke-primary/50" strokeWidth="2" strokeLinecap="round" />
      {/* Notification dot */}
      <circle cx="67" cy="28" r="4" className="fill-accent" />
    </svg>
  );
}
```

**Step 5: Create barrel export**

```tsx
// index.tsx
export { IsometricDesk } from './IsometricDesk';
export { IsometricBicycle } from './IsometricBicycle';
export { IsometricCalendar } from './IsometricCalendar';
export { IsometricChat } from './IsometricChat';
export type { IllustrationProps } from './IsometricDesk';
```

**Step 6: Commit**

```bash
git add src/components/atomic/illustrations/
git commit -m "feat: add isometric SVG illustrations for landing page feature cards"
```

---

## Task 3: Create FeaturesSection Component

**Files:**
- Create: `src/components/organisms/FeaturesSection/` (5-file pattern)

**Step 1: Generate component scaffold**

Run: `docker compose exec spoketowork pnpm run generate:component`
Answers: Name=`FeaturesSection`, Category=`organisms`, Props=`yes`, Hooks=`no`

**Step 2: Write failing test**

```tsx
// FeaturesSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeaturesSection from './FeaturesSection';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('FeaturesSection', () => {
  it('renders all 4 feature cards', () => {
    render(<FeaturesSection />);
    expect(screen.getByText('Track Companies')).toBeInTheDocument();
    expect(screen.getByText('Plan Routes')).toBeInTheDocument();
    expect(screen.getByText('Schedule Visits')).toBeInTheDocument();
    expect(screen.getByText('Stay Connected')).toBeInTheDocument();
  });

  it('links cards to correct pages', () => {
    render(<FeaturesSection />);
    expect(screen.getByRole('link', { name: /track companies/i })).toHaveAttribute('href', '/companies');
    expect(screen.getByRole('link', { name: /plan routes/i })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('link', { name: /schedule visits/i })).toHaveAttribute('href', '/schedule');
    expect(screen.getByRole('link', { name: /stay connected/i })).toHaveAttribute('href', '/messages');
  });

  it('visually distinguishes Plan Routes as primary feature', () => {
    render(<FeaturesSection />);
    const planRoutesCard = screen.getByRole('link', { name: /plan routes/i });
    expect(planRoutesCard.className).toContain('border-accent');
  });

  it('has a section heading', () => {
    render(<FeaturesSection />);
    expect(screen.getByRole('heading', { name: /features/i })).toBeInTheDocument();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `docker compose exec spoketowork pnpm exec vitest run src/components/organisms/FeaturesSection/FeaturesSection.test.tsx`

**Step 4: Implement FeaturesSection**

```tsx
// FeaturesSection.tsx
'use client';

import Link from 'next/link';
import {
  IsometricDesk,
  IsometricBicycle,
  IsometricCalendar,
  IsometricChat,
} from '@/components/atomic/illustrations';

export interface FeaturesSectionProps {
  className?: string;
}

const features = [
  {
    href: '/companies',
    title: 'Track Companies',
    description: 'Log applications & follow-ups',
    Illustration: IsometricDesk,
    primary: false,
  },
  {
    href: '/map',
    title: 'Plan Routes',
    description: 'Optimize your job hunt by bike',
    Illustration: IsometricBicycle,
    primary: true,
  },
  {
    href: '/schedule',
    title: 'Schedule Visits',
    description: 'Book interviews & follow-ups',
    Illustration: IsometricCalendar,
    primary: false,
  },
  {
    href: '/messages',
    title: 'Stay Connected',
    description: 'Message recruiters & contacts',
    Illustration: IsometricChat,
    primary: false,
  },
];

export default function FeaturesSection({ className = '' }: FeaturesSectionProps) {
  return (
    <section aria-label="Key features" className={`px-4 py-12 sm:px-6 lg:px-8 ${className}`}>
      <div className="container mx-auto">
        <h2 className="text-base-content mb-8 text-center text-2xl font-bold sm:text-3xl">Features</h2>
        <div className="grid grid-cols-1 gap-6 min-[500px]:grid-cols-2 lg:grid-cols-4">
          {features.map(({ href, title, description, Illustration, primary }) => (
            <Link
              key={href}
              href={href}
              aria-label={title}
              className={`card bg-base-100 focus-within:ring-primary cursor-pointer shadow-md transition-all focus-within:ring-2 hover:-translate-y-1 hover:shadow-lg ${
                primary ? 'border-accent border-2' : ''
              }`}
            >
              <div className="card-body items-center p-6 text-center">
                <Illustration className="mb-4 h-24 w-24" />
                <h3 className="card-title text-base">{title}</h3>
                <p className="text-base-content/85 text-sm">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 5: Run test to verify it passes**

Run: `docker compose exec spoketowork pnpm exec vitest run src/components/organisms/FeaturesSection/FeaturesSection.test.tsx`

**Step 6: Write accessibility test and story (same patterns as Task 1)**

**Step 7: Commit**

```bash
git add src/components/organisms/FeaturesSection/
git commit -m "feat: add FeaturesSection with isometric illustrations"
```

---

## Task 4: Create HowItWorksSection Component

**Files:**
- Create: `src/components/organisms/HowItWorksSection/` (5-file pattern)

**Step 1: Generate component scaffold**

Run: `docker compose exec spoketowork pnpm run generate:component`
Answers: Name=`HowItWorksSection`, Category=`organisms`, Props=`yes`, Hooks=`no`

**Step 2: Write failing test**

```tsx
// HowItWorksSection.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorksSection from './HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders section heading', () => {
    render(<HowItWorksSection />);
    expect(screen.getByRole('heading', { name: /how it works/i })).toBeInTheDocument();
  });

  it('renders all 3 steps', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Add Companies')).toBeInTheDocument();
    expect(screen.getByText('Plan Your Route')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByText(/track where you/i)).toBeInTheDocument();
    expect(screen.getByText(/optimized bicycle route/i)).toBeInTheDocument();
  });

  it('renders numbered steps', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
```

**Step 3: Implement HowItWorksSection**

```tsx
// HowItWorksSection.tsx
'use client';

export interface HowItWorksSectionProps {
  className?: string;
}

const steps = [
  { number: '1', title: 'Sign Up', description: 'Create your account' },
  { number: '2', title: 'Add Companies', description: 'Track where you\'ve applied' },
  { number: '3', title: 'Plan Your Route', description: 'Generate an optimized bicycle route' },
];

export default function HowItWorksSection({ className = '' }: HowItWorksSectionProps) {
  return (
    <section aria-label="How it works" className={`bg-base-200 px-4 py-12 sm:px-6 lg:px-8 ${className}`}>
      <div className="container mx-auto">
        <h2 className="text-base-content mb-10 text-center text-2xl font-bold sm:text-3xl">How It Works</h2>
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center md:gap-4 lg:gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center gap-4 md:flex-col md:gap-0">
              {/* Connector line (between steps, not before first) */}
              {i > 0 && (
                <div className="hidden h-0.5 w-12 bg-base-content/20 md:block lg:w-20" aria-hidden="true" />
              )}
              <div className="flex flex-col items-center text-center md:mx-4">
                <div className="bg-primary text-primary-content mb-3 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
                  {step.number}
                </div>
                <h3 className="text-base-content mb-1 text-lg font-semibold">{step.title}</h3>
                <p className="text-base-content/70 text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 4: Run tests, write a11y test and story, commit**

```bash
git add src/components/organisms/HowItWorksSection/
git commit -m "feat: add HowItWorksSection with 3-step numbered flow"
```

---

## Task 5: Create CTAFooter Component

**Files:**
- Create: `src/components/organisms/CTAFooter/` (5-file pattern)

**Step 1: Generate component scaffold**

Run: `docker compose exec spoketowork pnpm run generate:component`
Answers: Name=`CTAFooter`, Category=`organisms`, Props=`yes`, Hooks=`no`

**Step 2: Write failing test**

```tsx
// CTAFooter.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CTAFooter from './CTAFooter';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('CTAFooter', () => {
  it('renders the headline', () => {
    render(<CTAFooter />);
    expect(screen.getByText(/ready to ride/i)).toBeInTheDocument();
  });

  it('renders the Get Started CTA', () => {
    render(<CTAFooter />);
    const cta = screen.getByRole('link', { name: /get started/i });
    expect(cta).toHaveAttribute('href', '/sign-up');
  });

  it('has the primary button style', () => {
    render(<CTAFooter />);
    const cta = screen.getByRole('link', { name: /get started/i });
    expect(cta.className).toContain('btn-primary');
  });
});
```

**Step 3: Implement CTAFooter**

```tsx
// CTAFooter.tsx
'use client';

import Link from 'next/link';

export interface CTAFooterProps {
  className?: string;
}

export default function CTAFooter({ className = '' }: CTAFooterProps) {
  return (
    <section aria-label="Call to action" className={`px-4 py-16 sm:px-6 lg:px-8 ${className}`}>
      <div className="container mx-auto text-center">
        <h2 className="text-base-content mb-3 text-2xl font-bold sm:text-3xl">Ready to ride?</h2>
        <p className="text-base-content/70 mb-8 text-lg">
          Start planning your job search route today.
        </p>
        <Link
          href="/sign-up"
          className="btn btn-primary btn-lg min-h-11 min-w-11"
        >
          Get Started
        </Link>
      </div>
    </section>
  );
}
```

**Step 4: Run tests, write a11y test and story, commit**

```bash
git add src/components/organisms/CTAFooter/
git commit -m "feat: add CTAFooter component with sign-up CTA"
```

---

## Task 6: Refactor page.tsx to Compose Sections

**Files:**
- Modify: `src/app/page.tsx` (replace 310 lines with ~40 lines)

**Step 1: Write the new page.tsx**

```tsx
// page.tsx
'use client';

import { useEffect } from 'react';
import HeroSection from '@/components/organisms/HeroSection';
import FeaturesSection from '@/components/organisms/FeaturesSection';
import HowItWorksSection from '@/components/organisms/HowItWorksSection';
import CTAFooter from '@/components/organisms/CTAFooter';

export default function Home() {
  useEffect(() => {
    const handleResize = () => {
      document.body.style.overflow = window.innerWidth < 768 ? '' : 'hidden';
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="from-base-200 via-base-100 to-base-200 flex min-h-[calc(100vh-10rem)] flex-col overflow-x-hidden overflow-y-auto bg-gradient-to-br">
      <a
        href="#main-content"
        className="btn btn-sm btn-primary sr-only min-h-11 min-w-11 focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTAFooter />
    </div>
  );
}
```

Note: Change `h-[calc(100vh-10rem)]` to `min-h-[calc(100vh-10rem)]` so the page can scroll to show all sections.

**Step 2: Run all landing page tests**

Run: `docker compose exec spoketowork pnpm exec vitest run src/components/organisms/HeroSection/ src/components/organisms/FeaturesSection/ src/components/organisms/HowItWorksSection/ src/components/organisms/CTAFooter/`
Expected: ALL PASS

**Step 3: Visual verification in Storybook**

Run: `docker compose exec spoketowork pnpm run storybook`
Check each section story renders correctly in spoketowork-dark, spoketowork-light, and dracula themes.

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: compose landing page from section components"
```

---

## Task 7: Theme Verification and Final Polish

**Step 1: Run accessibility tests**

Run: `docker compose exec spoketowork pnpm exec vitest run --reporter=verbose src/components/organisms/HeroSection/ src/components/organisms/FeaturesSection/ src/components/organisms/HowItWorksSection/ src/components/organisms/CTAFooter/`
Expected: ALL PASS

**Step 2: Run full test suite to check for regressions**

Run: `docker compose exec spoketowork pnpm test`
Expected: No new failures

**Step 3: Visual check in browser**

Run dev server: `docker compose exec spoketowork pnpm run dev`
Verify at `localhost:3000`:
- spoketowork-dark: All sections visible, illustrations use theme colors, CTAs prominent
- spoketowork-light: Contrast holds, no invisible elements
- dracula: High-contrast theme still works

**Step 4: Verify mobile responsiveness**

Check at 390px width (iPhone 12):
- Sections stack vertically
- Touch targets >= 44px
- Feature badges hidden on small screens
- How It Works steps stack vertically

**Step 5: Final commit if any polish needed**

```bash
git commit -m "fix: landing page theme and responsive polish"
```
