import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroSection from './HeroSection';

// Mock next/link to render as plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock RouteHeroIllustration - renders a pin so queries still succeed
vi.mock('@/components/atomic/illustrations', () => ({
  RouteHeroIllustration: ({ animated, ...props }: any) => (
    <svg {...props}>
      <g data-testid="route-pin" />
    </svg>
  ),
}));

// Mock AnimatedLogo
vi.mock('@/components/atomic/AnimatedLogo', () => ({
  AnimatedLogo: ({ text, className }: any) => (
    <span data-testid="animated-logo" className={className}>
      {text}
    </span>
  ),
}));

// Mock project config
vi.mock('@/config/project-detected', () => ({
  detectedConfig: {
    projectName: 'SpokeToWork',
    basePath: '',
  },
}));

describe('HeroSection', () => {
  it('renders the tagline "Route Your Job Search"', () => {
    render(<HeroSection />);
    expect(screen.getByText('Route Your Job Search')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<HeroSection />);
    expect(
      screen.getByText('Plan bicycle routes, track applications, land the job.')
    ).toBeInTheDocument();
  });

  it('renders "Get Started" CTA linking to /sign-up', () => {
    render(<HeroSection />);
    const getStarted = screen.getByRole('link', { name: 'Get Started' });
    expect(getStarted).toBeInTheDocument();
    expect(getStarted).toHaveAttribute('href', '/sign-up');
  });

  it('renders "Try the Map" CTA linking to /map', () => {
    render(<HeroSection />);
    const tryMap = screen.getByRole('link', { name: 'Try the Map' });
    expect(tryMap).toBeInTheDocument();
    expect(tryMap).toHaveAttribute('href', '/map');
  });

  it('renders the animated logo with project name', () => {
    render(<HeroSection />);
    const animated = screen.getByTestId('animated-logo');
    expect(animated).toBeInTheDocument();
    expect(animated).toHaveTextContent('SpokeToWork');
  });

  it('renders the route illustration', () => {
    const { container } = render(<HeroSection />);
    // The RouteHeroIllustration renders an SVG with route pins
    expect(
      container.querySelector('[data-testid="route-pin"]')
    ).toBeInTheDocument();
  });

  it('does not render feature badge pills', () => {
    render(<HeroSection />);
    // old badges had role=listitem
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('does not render secondary navigation', () => {
    render(<HeroSection />);
    // old secondary nav had Companies/Blog/Schedule/Contact links
    expect(
      screen.queryByRole('link', { name: /Companies/i })
    ).not.toBeInTheDocument();
  });

  it('renders primary navigation region', () => {
    render(<HeroSection />);
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' })
    ).toBeInTheDocument();
  });

  it('renders section with id="main-content"', () => {
    render(<HeroSection />);
    const section = screen.getByRole('region', { name: 'Welcome hero' });
    expect(section).toHaveAttribute('id', 'main-content');
  });

  it('accepts and applies className prop', () => {
    render(<HeroSection className="custom-class" />);
    const section = screen.getByRole('region', { name: 'Welcome hero' });
    expect(section.className).toContain('custom-class');
  });

  it('renders CTA buttons with 44px touch targets', () => {
    render(<HeroSection />);
    const getStarted = screen.getByRole('link', { name: 'Get Started' });
    const tryMap = screen.getByRole('link', { name: 'Try the Map' });

    expect(getStarted.className).toContain('min-h-11');
    expect(getStarted.className).toContain('min-w-11');
    expect(tryMap.className).toContain('min-h-11');
    expect(tryMap.className).toContain('min-w-11');
  });
});
