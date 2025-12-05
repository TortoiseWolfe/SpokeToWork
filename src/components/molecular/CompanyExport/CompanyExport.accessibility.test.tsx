import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompanyExport from './CompanyExport';

expect.extend(toHaveNoViolations);

const defaultProps = {
  onExport: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' })),
  companyCount: 5,
};

describe('CompanyExport Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<CompanyExport {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when disabled', async () => {
    const { container } = render(<CompanyExport {...defaultProps} disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(<CompanyExport {...defaultProps} />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<CompanyExport {...defaultProps} />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Images should have alt text (no images in this component)
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should have aria-labels on all buttons', () => {
    const { container } = render(<CompanyExport {...defaultProps} />);

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(4); // CSV, JSON, GPX, Print

    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should have title attributes for tooltips', () => {
    const { container } = render(<CompanyExport {...defaultProps} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('title');
    });
  });
});
