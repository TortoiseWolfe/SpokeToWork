import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AuthPageShell from './AuthPageShell';

expect.extend(toHaveNoViolations);

vi.mock('@/components/atomic/illustrations', () => ({
  RouteHeroIllustration: (props: Record<string, unknown>) => (
    <svg data-testid="route-hero-illustration" {...props} />
  ),
}));

describe('AuthPageShell Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <AuthPageShell>
        <h1>Sign In</h1>
        <form>
          <label htmlFor="x">Email</label>
          <input id="x" type="email" />
        </form>
      </AuthPageShell>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('illustration SVGs are aria-hidden', () => {
    const { getAllByTestId } = render(<AuthPageShell>x</AuthPageShell>);
    const illustrations = getAllByTestId('route-hero-illustration');
    illustrations.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
