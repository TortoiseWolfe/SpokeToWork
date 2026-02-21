import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import HeroSection from './HeroSection';

expect.extend(toHaveNoViolations);

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

describe('HeroSection Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<HeroSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have a landmark region with accessible label', () => {
    render(<HeroSection />);
    const section = screen.getByRole('region', { name: 'Welcome hero' });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-label', 'Welcome hero');
  });

  it('should have labeled navigation regions', () => {
    render(<HeroSection />);
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Secondary navigation' })
    ).toBeInTheDocument();
  });

  it('should have a labeled feature list', () => {
    render(<HeroSection />);
    expect(
      screen.getByRole('list', { name: 'Key features' })
    ).toBeInTheDocument();
  });

  it('should have no violations with custom className', async () => {
    const { container } = render(<HeroSection className="custom-class" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
