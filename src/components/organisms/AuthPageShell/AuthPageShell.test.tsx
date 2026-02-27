import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthPageShell from './AuthPageShell';

// Mock RouteHeroIllustration — test independence from SVG internals
vi.mock('@/components/atomic/illustrations', () => ({
  RouteHeroIllustration: (props: Record<string, unknown>) => (
    <svg data-testid="route-hero-illustration" {...props} />
  ),
}));

describe('AuthPageShell', () => {
  it('renders children', () => {
    render(
      <AuthPageShell>
        <p>form content</p>
      </AuthPageShell>
    );
    expect(screen.getByText('form content')).toBeInTheDocument();
  });

  it('renders RouteHeroIllustration', () => {
    render(<AuthPageShell>x</AuthPageShell>);
    // Two instances: desktop panel (hidden <md) + mobile header (hidden ≥md)
    expect(
      screen.getAllByTestId('route-hero-illustration').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders the tagline "Route Your Job Search"', () => {
    render(<AuthPageShell>x</AuthPageShell>);
    expect(screen.getByText('Route Your Job Search')).toBeInTheDocument();
  });

  it('applies custom className to root', () => {
    const { container } = render(
      <AuthPageShell className="custom">x</AuthPageShell>
    );
    expect((container.firstChild as HTMLElement).className).toContain('custom');
  });

  it('illustration panel has bg-base-200', () => {
    render(<AuthPageShell>x</AuthPageShell>);
    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('bg-base-200');
  });
});
