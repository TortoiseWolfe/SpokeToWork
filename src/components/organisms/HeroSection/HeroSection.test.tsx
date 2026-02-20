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

// Mock SpinningLogo - destructure out non-DOM props to avoid React warnings
vi.mock('@/components/atomic/SpinningLogo', () => ({
  LayeredSpokeToWorkLogo: ({ speed, pauseOnHover, ...props }: any) => (
    <div data-testid="spinning-logo" {...props}>
      Mock Spinning Logo
    </div>
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

  it('renders the spinning logo', () => {
    render(<HeroSection />);
    expect(screen.getByTestId('spinning-logo')).toBeInTheDocument();
  });

  it('renders the animated logo with project name', () => {
    render(<HeroSection />);
    const animated = screen.getByTestId('animated-logo');
    expect(animated).toBeInTheDocument();
    expect(animated).toHaveTextContent('SpokeToWork');
  });

  it('renders primary navigation region', () => {
    render(<HeroSection />);
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' })
    ).toBeInTheDocument();
  });

  it('renders secondary navigation with expected links', () => {
    render(<HeroSection />);
    const secondaryNav = screen.getByRole('navigation', {
      name: 'Secondary navigation',
    });
    expect(secondaryNav).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Companies' })).toHaveAttribute(
      'href',
      '/companies'
    );
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
      'href',
      '/blog'
    );
    expect(screen.getByRole('link', { name: 'Schedule' })).toHaveAttribute(
      'href',
      '/schedule'
    );
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact'
    );
  });

  it('renders feature badges', () => {
    render(<HeroSection />);
    const featureList = screen.getByRole('list', { name: 'Key features' });
    expect(featureList).toBeInTheDocument();

    expect(screen.getByText('Track Applications')).toBeInTheDocument();
    expect(screen.getByText('Route Planning')).toBeInTheDocument();
    expect(screen.getByText('Offline Ready')).toBeInTheDocument();
    expect(screen.getByText('Mobile First')).toBeInTheDocument();
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
