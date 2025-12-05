import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ApplicationForm from './ApplicationForm';
import type { JobApplication } from '@/types/company';

expect.extend(toHaveNoViolations);

describe('ApplicationForm Accessibility', () => {
  const testCompanyId = 'test-company-123';

  it('has no accessibility violations in create mode', async () => {
    const { container } = render(
      <ApplicationForm companyId={testCompanyId} companyName="Test Company" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in edit mode', async () => {
    const existingApplication: JobApplication = {
      id: 'app-123',
      company_id: testCompanyId,
      user_id: 'user-123',
      position_title: 'Software Engineer',
      job_link: 'https://example.com/job',
      work_location_type: 'remote',
      status: 'applied',
      outcome: 'pending',
      date_applied: '2024-01-15',
      interview_date: null,
      follow_up_date: null,
      priority: 3,
      notes: null,
      is_active: true,
      created_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2024-01-15T00:00:00.000Z',
    };

    const { container } = render(
      <ApplicationForm
        companyId={testCompanyId}
        application={existingApplication}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('all form inputs have associated labels', () => {
    render(<ApplicationForm companyId={testCompanyId} />);

    // Check that all inputs have labels
    expect(screen.getByLabelText(/position title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job posting link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/outcome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date applied/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/interview date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/follow-up date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('form elements are keyboard navigable', () => {
    render(<ApplicationForm companyId={testCompanyId} />);

    // All interactive elements should be focusable
    const positionInput = screen.getByLabelText(/position title/i);
    const jobLinkInput = screen.getByLabelText(/job posting link/i);
    const workLocationSelect = screen.getByLabelText(/work location/i);
    const submitButton = screen.getByRole('button', {
      name: /add application/i,
    });

    expect(positionInput).not.toHaveAttribute('tabindex', '-1');
    expect(jobLinkInput).not.toHaveAttribute('tabindex', '-1');
    expect(workLocationSelect).not.toHaveAttribute('tabindex', '-1');
    expect(submitButton).not.toHaveAttribute('tabindex', '-1');
  });

  it('submit button has accessible name', () => {
    render(<ApplicationForm companyId={testCompanyId} />);

    const submitButton = screen.getByRole('button', {
      name: /add application/i,
    });
    expect(submitButton).toBeInTheDocument();
  });

  it('cancel button has accessible name when present', () => {
    render(<ApplicationForm companyId={testCompanyId} onCancel={() => {}} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('form has semantic structure', () => {
    render(
      <ApplicationForm companyId={testCompanyId} companyName="Test Company" />
    );

    // Should have a form element
    expect(screen.getByTestId('application-form')).toBeInTheDocument();

    // Should have a heading
    expect(
      screen.getByRole('heading', { name: /add job application/i })
    ).toBeInTheDocument();
  });

  it('select elements have valid options', () => {
    render(<ApplicationForm companyId={testCompanyId} />);

    const statusSelect = screen.getByLabelText(/^status$/i);
    const options = statusSelect.querySelectorAll('option');

    expect(options.length).toBeGreaterThan(0);
    options.forEach((option) => {
      expect(option).toHaveAttribute('value');
      expect(option.textContent).toBeTruthy();
    });
  });

  it('date inputs have correct type', () => {
    render(<ApplicationForm companyId={testCompanyId} />);

    const dateApplied = screen.getByLabelText(/date applied/i);
    const interviewDate = screen.getByLabelText(/interview date/i);
    const followUpDate = screen.getByLabelText(/follow-up date/i);

    expect(dateApplied).toHaveAttribute('type', 'date');
    expect(interviewDate).toHaveAttribute('type', 'date');
    expect(followUpDate).toHaveAttribute('type', 'date');
  });
});
