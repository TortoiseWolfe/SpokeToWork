import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompanyDetailDrawer from './CompanyDetailDrawer';
import type { CompanyWithApplications } from '@/types/company';

expect.extend(toHaveNoViolations);

const mockCompany: CompanyWithApplications = {
  id: 'company-123',
  user_id: 'user-456',
  name: 'Acme Corporation',
  address: '123 Main St, Cleveland, OH',
  latitude: 41.4993,
  longitude: -81.6944,
  website: 'https://acme.example.com',
  careers_url: null,
  email: 'hr@acme.example.com',
  phone: '555-123-4567',
  contact_name: 'John Smith',
  contact_title: 'HR Manager',
  notes: 'Great company',
  status: 'contacted',
  priority: 2,
  follow_up_date: null,
  is_active: true,
  extended_range: false,
  route_id: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-10T00:00:00.000Z',
  applications: [
    {
      id: 'app-1',
      shared_company_id: 'company-123',
      private_company_id: null,
      user_id: 'user-456',
      position_title: 'Software Engineer',
      job_link: 'https://jobs.acme.com/123',
      work_location_type: 'hybrid',
      status: 'interviewing',
      outcome: 'pending',
      date_applied: '2024-01-15',
      interview_date: '2024-01-25T10:00:00.000Z',
      follow_up_date: null,
      priority: 2,
      notes: null,
      is_active: true,
      created_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2024-01-20T00:00:00.000Z',
    },
  ],
  latest_application: {
    id: 'app-1',
    shared_company_id: 'company-123',
    private_company_id: null,
    user_id: 'user-456',
    position_title: 'Software Engineer',
    job_link: 'https://jobs.acme.com/123',
    work_location_type: 'hybrid',
    status: 'interviewing',
    outcome: 'pending',
    date_applied: '2024-01-15',
    interview_date: '2024-01-25T10:00:00.000Z',
    follow_up_date: null,
    priority: 2,
    notes: null,
    is_active: true,
    created_at: '2024-01-10T00:00:00.000Z',
    updated_at: '2024-01-20T00:00:00.000Z',
  },
  total_applications: 1,
};

describe('CompanyDetailDrawer Accessibility', () => {
  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with all actions', async () => {
    const { container } = render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
        onEditCompany={() => {}}
        onAddApplication={() => {}}
        onEditApplication={() => {}}
        onDeleteApplication={() => {}}
        onStatusChange={() => {}}
        onOutcomeChange={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper dialog role', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal attribute', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby for dialog title', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'drawer-title');
    expect(screen.getByText('Acme Corporation').closest('h2')).toHaveAttribute(
      'id',
      'drawer-title'
    );
  });

  it('close button has accessible label', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
  });

  it('edit company button has accessible label', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
        onEditCompany={() => {}}
      />
    );

    expect(screen.getByLabelText('Edit company')).toBeInTheDocument();
  });

  it('add application button has accessible label', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
        onAddApplication={() => {}}
      />
    );

    expect(screen.getByLabelText('Add application')).toBeInTheDocument();
  });

  it('application edit buttons have accessible labels', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
        onEditApplication={() => {}}
      />
    );

    expect(screen.getByLabelText('Edit Software Engineer')).toBeInTheDocument();
  });

  it('application delete buttons have accessible labels', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
        onDeleteApplication={() => {}}
      />
    );

    expect(
      screen.getByLabelText('Delete Software Engineer')
    ).toBeInTheDocument();
  });

  it('status dropdowns have accessible labels', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
        onStatusChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Change status')).toBeInTheDocument();
  });

  it('outcome dropdowns have accessible labels', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
        onOutcomeChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Change outcome')).toBeInTheDocument();
  });

  it('backdrop is hidden from assistive technology', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(
      screen.getByTestId('company-detail-drawer-backdrop')
    ).toHaveAttribute('aria-hidden', 'true');
  });

  it('external links open in new tab with security attributes', () => {
    render(
      <CompanyDetailDrawer
        company={mockCompany}
        isOpen={true}
        onClose={() => {}}
      />
    );

    const viewJobLink = screen.getByText('View Job');
    expect(viewJobLink).toHaveAttribute('target', '_blank');
    expect(viewJobLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
