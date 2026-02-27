import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import FeatureSpotlight from './FeatureSpotlight';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...p
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

expect.extend(toHaveNoViolations);

describe('FeatureSpotlight Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <FeatureSpotlight
        title="Plan Routes"
        description="Map your commute."
        href="/map"
        ctaLabel="Open the Map"
        illustration={<svg aria-hidden="true" />}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
