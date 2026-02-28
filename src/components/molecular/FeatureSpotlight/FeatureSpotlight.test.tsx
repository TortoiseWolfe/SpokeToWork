import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeatureSpotlight from './FeatureSpotlight';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

const DummyIllustration = () => <svg data-testid="spotlight-illustration" />;

describe('FeatureSpotlight', () => {
  it('renders title, description and CTA', () => {
    render(
      <FeatureSpotlight
        title="Plan Routes"
        description="Map your commute to every interview."
        href="/map"
        ctaLabel="Open the Map"
        illustration={<DummyIllustration />}
      />
    );
    expect(
      screen.getByRole('heading', { name: 'Plan Routes' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Map your commute to every interview.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the Map' })).toHaveAttribute(
      'href',
      '/map'
    );
  });

  it('renders the illustration slot', () => {
    render(
      <FeatureSpotlight
        title="t"
        description="d"
        href="/x"
        ctaLabel="go"
        illustration={<DummyIllustration />}
      />
    );
    expect(screen.getByTestId('spotlight-illustration')).toBeInTheDocument();
  });

  it('CTA meets 44px touch target', () => {
    render(
      <FeatureSpotlight
        title="t"
        description="d"
        href="/x"
        ctaLabel="go"
        illustration={<DummyIllustration />}
      />
    );
    const cta = screen.getByRole('link', { name: 'go' });
    expect(cta.className).toMatch(/min-h-11/);
    expect(cta.className).toMatch(/min-w-11/);
  });

  it('CTA is focusable', () => {
    render(
      <FeatureSpotlight
        title="t"
        description="d"
        href="/x"
        ctaLabel="go"
        illustration={<DummyIllustration />}
      />
    );
    const cta = screen.getByRole('link', { name: 'go' });
    cta.focus();
    expect(cta).toHaveFocus();
  });
});
