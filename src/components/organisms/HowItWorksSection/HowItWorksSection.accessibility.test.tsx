import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import HowItWorksSection from './HowItWorksSection';

expect.extend(toHaveNoViolations);

describe('HowItWorksSection Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<HowItWorksSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have a landmark region with accessible label', () => {
    render(<HowItWorksSection />);
    const section = screen.getByRole('region', { name: 'How it works' });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-label', 'How it works');
  });

  it('should have proper heading hierarchy (h2 > h3)', () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'How It Works' })
    ).toBeInTheDocument();
    const h3s = screen.getAllByRole('heading', { level: 3 });
    expect(h3s).toHaveLength(3);
  });

  it('should have no violations with custom className', async () => {
    const { container } = render(
      <HowItWorksSection className="custom-class" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
