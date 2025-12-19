import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompanyRow from './CompanyRow';
import type { Company } from '@/types/company';

expect.extend(toHaveNoViolations);

const mockCompany: Company = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Test Corp',
  contact_name: 'John Doe',
  contact_title: 'Manager',
  phone: '555-1234',
  email: 'john@test.com',
  website: 'https://test.com',
  careers_url: null,
  address: '123 Test St, New York, NY',
  latitude: 40.7128,
  longitude: -74.006,
  extended_range: false,
  status: 'not_contacted',
  priority: 3,
  notes: 'Test notes',
  follow_up_date: null,
  route_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const renderInTable = (ui: React.ReactElement) => {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>
  );
};

describe('CompanyRow Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = renderInTable(<CompanyRow company={mockCompany} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = renderInTable(<CompanyRow company={mockCompany} />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = renderInTable(<CompanyRow company={mockCompany} />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Images should have alt text
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should have proper button accessibility labels', () => {
    const { container } = renderInTable(<CompanyRow company={mockCompany} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      // Buttons should have accessible names
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute('aria-label');
      expect(hasText || hasAriaLabel).toBeTruthy();
    });
  });

  // Feature 044: Active route indicator accessibility tests
  describe('Active Route Indicator Accessibility (Feature 044)', () => {
    it('should have no accessibility violations with active route indicator', async () => {
      const { container } = renderInTable(
        <CompanyRow company={mockCompany} isOnActiveRoute={true} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have aria-label on active route indicator', () => {
      const { container } = renderInTable(
        <CompanyRow company={mockCompany} isOnActiveRoute={true} />
      );

      const indicator = container.querySelector(
        '[aria-label="On active route"]'
      );
      expect(indicator).toBeInTheDocument();
    });

    it('should have screen reader only text for active route indicator', () => {
      const { container } = renderInTable(
        <CompanyRow company={mockCompany} isOnActiveRoute={true} />
      );

      const srOnly = container.querySelector('.sr-only');
      expect(srOnly).toBeInTheDocument();
      expect(srOnly?.textContent).toBe('On active route');
    });

    it('should have title attribute for tooltip', () => {
      const { container } = renderInTable(
        <CompanyRow company={mockCompany} isOnActiveRoute={true} />
      );

      const indicatorWithTitle = container.querySelector(
        '[title="On active route"]'
      );
      expect(indicatorWithTitle).toBeInTheDocument();
    });
  });
});
