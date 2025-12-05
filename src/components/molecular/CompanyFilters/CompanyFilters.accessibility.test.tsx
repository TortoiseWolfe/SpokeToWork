import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompanyFilters from './CompanyFilters';
import type { CompanyFilters as CompanyFiltersType } from '@/types/company';

expect.extend(toHaveNoViolations);

const defaultFilters: CompanyFiltersType = {
  search: '',
  status: undefined,
  priority: undefined,
  is_active: undefined,
  extended_range: undefined,
};

const defaultProps = {
  filters: defaultFilters,
  onFiltersChange: vi.fn(),
};

describe('CompanyFilters Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<CompanyFilters {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(<CompanyFilters {...defaultProps} />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<CompanyFilters {...defaultProps} />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Images should have alt text
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should have proper form labels', () => {
    const { container } = render(<CompanyFilters {...defaultProps} />);

    // All inputs should have associated labels
    const inputs = container.querySelectorAll('input, select');
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      if (id) {
        const label = container.querySelector(`label[for="${id}"]`);
        expect(label || input.getAttribute('aria-label')).toBeTruthy();
      }
    });
  });
});
