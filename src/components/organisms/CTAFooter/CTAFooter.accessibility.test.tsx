import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CTAFooter from './CTAFooter';

expect.extend(toHaveNoViolations);

// Mock next/link to render as plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe('CTAFooter Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<CTAFooter />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have section with aria-label="Call to action"', () => {
    render(<CTAFooter />);
    const section = screen.getByRole('region', { name: 'Call to action' });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-label', 'Call to action');
  });

  it('should have CTA link with proper accessible text', () => {
    render(<CTAFooter />);
    const cta = screen.getByRole('link', { name: 'Find Work' });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/sign-up');
  });

  it('should have no violations with custom className', async () => {
    const { container } = render(<CTAFooter className="custom-class" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
