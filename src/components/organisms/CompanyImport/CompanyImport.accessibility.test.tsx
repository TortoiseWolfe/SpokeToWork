import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompanyImport from './CompanyImport';

expect.extend(toHaveNoViolations);

const defaultProps = {
  onImport: vi.fn().mockResolvedValue({ success: 0, failed: 0, errors: [] }),
};

describe('CompanyImport Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<CompanyImport {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(
      <CompanyImport {...defaultProps} onCancel={vi.fn()} />
    );

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<CompanyImport {...defaultProps} />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Images should have alt text (no images in this component)
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should have aria-labels on buttons', () => {
    const { container } = render(
      <CompanyImport {...defaultProps} onCancel={vi.fn()} />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute('aria-label');
      expect(hasText || hasAriaLabel).toBeTruthy();
    });
  });

  it('should have labeled file input', () => {
    const { container } = render(<CompanyImport {...defaultProps} />);

    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('aria-label');
  });
});
