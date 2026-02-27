import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import FeaturesSection from './FeaturesSection';

expect.extend(toHaveNoViolations);

// Mock next/link to render as plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock illustration components
vi.mock('@/components/atomic/illustrations', () => ({
  IsometricDesk: () => <div data-testid="illustration-desk" />,
  IsometricBicycle: () => <div data-testid="illustration-bicycle" />,
  IsometricCalendar: () => <div data-testid="illustration-calendar" />,
  IsometricChat: () => <div data-testid="illustration-chat" />,
}));

describe('FeaturesSection Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<FeaturesSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have a landmark region with accessible label', () => {
    render(<FeaturesSection />);
    const section = screen.getByRole('region', { name: 'Features' });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-label', 'Features');
  });

  it('should have accessible link text on spotlight CTA and each grid card', () => {
    render(<FeaturesSection />);
    expect(
      screen.getByRole('link', { name: /Open the Map/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Track Companies' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Schedule Visits' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Stay Connected' })
    ).toBeInTheDocument();
  });

  it('should have proper heading hierarchy (h2 > h3)', () => {
    render(<FeaturesSection />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Features' })
    ).toBeInTheDocument();
    const h3s = screen.getAllByRole('heading', { level: 3 });
    expect(h3s).toHaveLength(4);
  });

  it('should have no violations with custom className', async () => {
    const { container } = render(<FeaturesSection className="custom-class" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
