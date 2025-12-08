import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ApplicationRow from './ApplicationRow';
import type { JobApplication } from '@/types/company';

expect.extend(toHaveNoViolations);

const mockApplication: JobApplication = {
  id: 'app-123',
  shared_company_id: 'company-456',
  private_company_id: null,
  user_id: 'user-789',
  position_title: 'Software Engineer',
  job_link: 'https://example.com/job',
  work_location_type: 'remote',
  status: 'applied',
  outcome: 'pending',
  date_applied: '2024-01-15',
  interview_date: '2024-01-20T10:00:00.000Z',
  follow_up_date: null,
  priority: 3,
  notes: null,
  is_active: true,
  created_at: '2024-01-10T00:00:00.000Z',
  updated_at: '2024-01-15T00:00:00.000Z',
};

// Wrapper to provide proper table structure for accessibility
const AccessibleTableWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <table>
    <thead>
      <tr>
        <th>Position</th>
        <th>Status</th>
        <th>Outcome</th>
        <th>Applied</th>
        <th>Interview</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);

describe('ApplicationRow Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AccessibleTableWrapper>
        <ApplicationRow application={mockApplication} />
      </AccessibleTableWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with actions', async () => {
    const { container } = render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </AccessibleTableWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with dropdowns', async () => {
    const { container } = render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onStatusChange={() => {}}
          onOutcomeChange={() => {}}
        />
      </AccessibleTableWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('edit button has accessible label', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow application={mockApplication} onEdit={() => {}} />
      </AccessibleTableWrapper>
    );

    expect(
      screen.getByLabelText(/edit software engineer/i)
    ).toBeInTheDocument();
  });

  it('delete button has accessible label', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow application={mockApplication} onDelete={() => {}} />
      </AccessibleTableWrapper>
    );

    expect(
      screen.getByLabelText(/delete software engineer/i)
    ).toBeInTheDocument();
  });

  it('status dropdown has accessible label', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onStatusChange={() => {}}
        />
      </AccessibleTableWrapper>
    );

    expect(screen.getByLabelText(/change status/i)).toBeInTheDocument();
  });

  it('outcome dropdown has accessible label', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onOutcomeChange={() => {}}
        />
      </AccessibleTableWrapper>
    );

    expect(screen.getByLabelText(/change outcome/i)).toBeInTheDocument();
  });

  it('job link has accessible attributes', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow application={mockApplication} />
      </AccessibleTableWrapper>
    );

    const jobLink = screen.getByText('View Job');
    expect(jobLink).toHaveAttribute('target', '_blank');
    expect(jobLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('row is keyboard navigable', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onEdit={() => {}}
          onDelete={() => {}}
          onStatusChange={() => {}}
        />
      </AccessibleTableWrapper>
    );

    const editButton = screen.getByLabelText(/edit/i);
    const deleteButton = screen.getByLabelText(/delete/i);
    const statusSelect = screen.getByLabelText(/change status/i);

    // Buttons and selects should be focusable
    expect(editButton).not.toHaveAttribute('tabindex', '-1');
    expect(deleteButton).not.toHaveAttribute('tabindex', '-1');
    expect(statusSelect).not.toHaveAttribute('tabindex', '-1');
  });

  it('uses semantic table structure', () => {
    const { container } = render(
      <AccessibleTableWrapper>
        <ApplicationRow application={mockApplication} />
      </AccessibleTableWrapper>
    );

    expect(container.querySelector('tr')).toBeInTheDocument();
    expect(container.querySelectorAll('td').length).toBeGreaterThan(0);
  });
});
