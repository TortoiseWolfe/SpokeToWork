import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ApplicationToast from './ApplicationToast';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

expect.extend(toHaveNoViolations);

const mockApplication: EmployerApplication = {
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
};

describe('ApplicationToast Accessibility', () => {
  it('should have no accessibility violations when visible', async () => {
    const { container } = render(
      <ApplicationToast application={mockApplication} onDismiss={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when hidden', async () => {
    const { container } = render(
      <ApplicationToast application={null} onDismiss={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have role="status" for screen reader announcements', () => {
    render(
      <ApplicationToast application={mockApplication} onDismiss={vi.fn()} />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have aria-live="polite" for non-intrusive announcements', () => {
    render(
      <ApplicationToast application={mockApplication} onDismiss={vi.fn()} />
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('should have accessible dismiss button', () => {
    render(
      <ApplicationToast application={mockApplication} onDismiss={vi.fn()} />
    );
    expect(
      screen.getByRole('button', { name: 'Dismiss notification' })
    ).toBeInTheDocument();
  });

  it('should have minimum touch target size on dismiss button', () => {
    render(
      <ApplicationToast application={mockApplication} onDismiss={vi.fn()} />
    );
    const button = screen.getByRole('button', {
      name: 'Dismiss notification',
    });
    expect(button.className).toContain('min-h-11');
    expect(button.className).toContain('min-w-11');
  });
});
