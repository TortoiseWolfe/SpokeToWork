import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RouteHeroIllustration } from '@/components/atomic/illustrations';

describe('RouteHeroIllustration', () => {
  it('renders an SVG element', () => {
    const { container } = render(<RouteHeroIllustration />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is aria-hidden by default', () => {
    const { container } = render(<RouteHeroIllustration />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('can opt out of aria-hidden', () => {
    const { container } = render(<RouteHeroIllustration aria-hidden={false} />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'false'
    );
  });

  it('passes className through', () => {
    const { container } = render(<RouteHeroIllustration className="w-64" />);
    expect(container.querySelector('svg')).toHaveClass('w-64');
  });

  it('renders at least 4 map pins', () => {
    const { container } = render(<RouteHeroIllustration />);
    const pins = container.querySelectorAll('[data-testid="route-pin"]');
    expect(pins.length).toBeGreaterThanOrEqual(4);
  });

  it('uses semantic DaisyUI classes (no hex colors)', () => {
    const { container } = render(<RouteHeroIllustration />);
    const svg = container.querySelector('svg')!;
    const html = svg.outerHTML;
    expect(html).not.toMatch(/(?:fill|stroke)="#[0-9a-fA-F]{3,6}"/);
  });
});
