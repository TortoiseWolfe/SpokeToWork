import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompanyTable from './CompanyTable';
import type { Company } from '@/types/company';

expect.extend(toHaveNoViolations);

const mockCompanies: Company[] = [
  {
    id: 'company-1',
    user_id: 'user-1',
    name: 'Acme Corp',
    contact_name: 'John Doe',
    contact_title: 'Manager',
    phone: '555-1234',
    email: 'john@acme.com',
    website: 'https://acme.com',
    careers_url: null,
    address: '123 Main St, New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    extended_range: false,
    status: 'contacted',
    priority: 2,
    notes: null,
    follow_up_date: null,
    route_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('CompanyTable Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<CompanyTable companies={mockCompanies} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when empty', async () => {
    const { container } = render(<CompanyTable companies={[]} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have focusable elements in proper tab order', () => {
    const { container } = render(<CompanyTable companies={mockCompanies} />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // All focusable elements should be visible
    focusableElements.forEach((element) => {
      expect(element).toBeVisible();
    });
  });

  it('should have proper semantic HTML', () => {
    const { container } = render(<CompanyTable companies={mockCompanies} />);

    // Verify component renders with proper HTML structure
    expect(container.firstChild).toBeInTheDocument();

    // Should have a table element
    expect(container.querySelector('table')).toBeInTheDocument();

    // Images should have alt text
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('should have proper table structure', () => {
    const { container } = render(<CompanyTable companies={mockCompanies} />);

    // Table should have thead and tbody
    expect(container.querySelector('thead')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();

    // Table headers should be th elements
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBeGreaterThan(0);
  });
});
