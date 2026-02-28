import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ApplicationDetailDrawer from './ApplicationDetailDrawer';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

const makeApp = (
  over: Partial<EmployerApplication> = {}
): EmployerApplication => ({
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
  notes: 'Strong portfolio',
  is_active: true,
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-10T00:00:00Z',
  applicant_name: 'Alice Chen',
  company_name: 'Acme Corp',
  ...over,
});

describe('ApplicationDetailDrawer', () => {
  it('renders nothing when application is null', () => {
    const { container } = render(
      <ApplicationDetailDrawer
        application={null}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders applicant name and company', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(screen.getByText('Alice Chen')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders position title', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('renders notes', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(screen.getByText('Strong portfolio')).toBeInTheDocument();
  });

  it('renders advance button for non-closed status', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp({ status: 'applied' })}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /advance to screening/i })
    ).toBeInTheDocument();
  });

  it('does not render advance button for closed status', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp({ status: 'closed' })}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('button', { name: /advance/i })
    ).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={onClose}
        onAdvance={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /close drawer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <ApplicationDetailDrawer
        application={makeApp()}
        onClose={onClose}
        onAdvance={vi.fn()}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onAdvance with correct args when advance button is clicked', () => {
    const onAdvance = vi.fn();
    render(
      <ApplicationDetailDrawer
        application={makeApp({ status: 'screening' })}
        onClose={vi.fn()}
        onAdvance={onAdvance}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /advance to interviewing/i })
    );
    expect(onAdvance).toHaveBeenCalledWith('app-1', 'interviewing');
  });

  it('shows interview date when present', () => {
    render(
      <ApplicationDetailDrawer
        application={makeApp({ interview_date: '2026-03-15T10:00:00Z' })}
        onClose={vi.fn()}
        onAdvance={vi.fn()}
      />
    );
    expect(screen.getByText('Interview')).toBeInTheDocument();
  });
});
