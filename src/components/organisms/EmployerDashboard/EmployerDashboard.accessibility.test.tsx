import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import EmployerDashboard from './EmployerDashboard';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

expect.extend(toHaveNoViolations);

const mockApplication = (
  overrides: Partial<EmployerApplication> = {}
): EmployerApplication => ({
  id: 'app-1',
  shared_company_id: 'comp-1',
  private_company_id: null,
  user_id: 'user-1',
  position_title: 'Software Engineer',
  job_link: null,
  position_url: null,
  status_url: null,
  work_location_type: 'remote',
  status: 'applied',
  outcome: 'pending',
  date_applied: '2026-01-15T00:00:00Z',
  interview_date: null,
  follow_up_date: null,
  priority: 3,
  notes: null,
  is_active: true,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  applicant_name: 'Jane Doe',
  company_name: 'Acme Corp',
  ...overrides,
});

describe('EmployerDashboard Accessibility', () => {
  const defaultProps = {
    applications: [mockApplication()],
    loading: false,
    error: null,
    onUpdateStatus: vi.fn().mockResolvedValue(undefined),
    onRefresh: vi.fn().mockResolvedValue(undefined),
  };

  it('should have no accessibility violations with applications', async () => {
    const { container } = render(<EmployerDashboard {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when loading', async () => {
    const { container } = render(
      <EmployerDashboard {...defaultProps} loading={true} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with error', async () => {
    const { container } = render(
      <EmployerDashboard {...defaultProps} error="Something went wrong" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when empty', async () => {
    const { container } = render(
      <EmployerDashboard {...defaultProps} applications={[]} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-label on loading spinner', () => {
    render(<EmployerDashboard {...defaultProps} loading={true} />);
    expect(
      screen.getByRole('status', { name: 'Loading applications' })
    ).toBeInTheDocument();
  });

  it('should have aria-label on applications table', () => {
    render(<EmployerDashboard {...defaultProps} />);
    expect(
      screen.getByRole('table', { name: 'Job applications' })
    ).toBeInTheDocument();
  });

  it('should have aria-pressed on filter badges', () => {
    render(<EmployerDashboard {...defaultProps} />);
    const allButton = screen.getByRole('button', { name: /All/ });
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should have descriptive aria-label on advance buttons', () => {
    render(<EmployerDashboard {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /Advance Jane Doe to Screening/ })
    ).toBeInTheDocument();
  });

  it('should have role="group" on status counts bar', () => {
    render(<EmployerDashboard {...defaultProps} />);
    expect(
      screen.getByRole('group', { name: 'Application status counts' })
    ).toBeInTheDocument();
  });
});
