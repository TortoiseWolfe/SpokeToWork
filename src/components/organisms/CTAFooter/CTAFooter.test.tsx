import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CTAFooter from './CTAFooter';

// Mock next/link to render as plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe('CTAFooter', () => {
  it('renders headline "Ready to ride?"', () => {
    render(<CTAFooter />);
    expect(
      screen.getByRole('heading', { name: 'Ready to ride?' })
    ).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<CTAFooter />);
    expect(
      screen.getByText('Start planning your job search route today.')
    ).toBeInTheDocument();
  });

  it('renders "Get Started" CTA linking to /sign-up', () => {
    render(<CTAFooter />);
    const cta = screen.getByRole('link', { name: 'Get Started' });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/sign-up');
  });

  it('CTA has btn-primary class', () => {
    render(<CTAFooter />);
    const cta = screen.getByRole('link', { name: 'Get Started' });
    expect(cta.className).toContain('btn-primary');
  });

  it('accepts and applies className prop', () => {
    render(<CTAFooter className="custom-class" />);
    const section = screen.getByRole('region', { name: 'Call to action' });
    expect(section.className).toContain('custom-class');
  });

  it('renders CTA with 44px touch targets', () => {
    render(<CTAFooter />);
    const cta = screen.getByRole('link', { name: 'Get Started' });
    expect(cta.className).toContain('min-h-11');
    expect(cta.className).toContain('min-w-11');
  });

  it('renders employer CTA linking to /sign-up?role=employer', () => {
    render(<CTAFooter />);
    const employerCta = screen.getByRole('link', { name: /Hiring cyclists/i });
    expect(employerCta).toHaveAttribute('href', '/sign-up?role=employer');
  });

  it('employer CTA meets 44px touch target', () => {
    render(<CTAFooter />);
    const employerCta = screen.getByRole('link', { name: /Hiring cyclists/i });
    expect(employerCta.className).toMatch(/min-h-11/);
  });
});
