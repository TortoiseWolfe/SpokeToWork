import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApplicationDetailDrawer from './ApplicationDetailDrawer';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

const makeApp = (): EmployerApplication => ({
  id: 'app-1',
  shared_company_id: 'comp-1',
  private_company_id: null,
  user_id: 'user-1',
  position_title: 'Frontend Developer',
  job_link: null,
  position_url: null,
  status_url: null,
  work_location_type: 'remote',
  status: 'applied',
  outcome: 'pending',
  date_applied: '2026-02-10T00:00:00Z',
  interview_date: null,
  follow_up_date: null,
  priority: 2,
  notes: null,
  is_active: true,
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-10T00:00:00Z',
  applicant_name: 'Alice Chen',
  company_name: 'Acme Corp',
});

describe('ApplicationDetailDrawer Accessibility', () => {
  it('has role="dialog" with aria-label', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(
      screen.getByRole('dialog', { name: /alice chen/i })
    ).toBeInTheDocument();
  });

  it('has aria-modal="true"', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('close button has accessible label', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /close drawer/i })
    ).toBeInTheDocument();
  });
});
