import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ApplicationRow from './ApplicationRow';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

expect.extend(toHaveNoViolations);

const mockApplication: EmployerApplication = {
  id: 'app-123',
  shared_company_id: 'company-456',
  private_company_id: null,
  user_id: 'user-789',
  position_title: 'Software Engineer',
  job_link: 'https://example.com/job',
  position_url: null,
  status_url: null,
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
  applicant_name: 'Jane Doe',
  company_name: 'Acme Corp',
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
        <th>Applicant</th>
        <th>Position</th>
        <th>Status</th>
        <th>Applied</th>
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
        <ApplicationRow
          application={mockApplication}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      </AccessibleTableWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when updating', async () => {
    const { container } = render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onAdvance={vi.fn()}
          updating={true}
          isRepeat={false}
        />
      </AccessibleTableWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with repeat badge', async () => {
    const { container } = render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={true}
        />
      </AccessibleTableWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('advance button has accessible label', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      </AccessibleTableWrapper>
    );

    expect(
      screen.getByLabelText(/advance jane doe to screening/i)
    ).toBeInTheDocument();
  });

  it('has no advance button for closed status', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={{ ...mockApplication, status: 'closed' }}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      </AccessibleTableWrapper>
    );

    expect(
      screen.queryByRole('button', { name: /advance/i })
    ).not.toBeInTheDocument();
  });

  it('advance button is focusable', () => {
    render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      </AccessibleTableWrapper>
    );

    const advanceButton = screen.getByLabelText(/advance/i);
    expect(advanceButton).not.toHaveAttribute('tabindex', '-1');
  });

  it('uses semantic table structure', () => {
    const { container } = render(
      <AccessibleTableWrapper>
        <ApplicationRow
          application={mockApplication}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      </AccessibleTableWrapper>
    );

    expect(container.querySelector('tr')).toBeInTheDocument();
    expect(container.querySelectorAll('td').length).toBeGreaterThan(0);
  });
});
