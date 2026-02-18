import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationToast from './ApplicationToast';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

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

describe('ApplicationToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when application is null', () => {
    const { container } = render(
      <ApplicationToast application={null} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders toast with application info', () => {
    render(
      <ApplicationToast application={mockApplication} onDismiss={vi.fn()} />
    );
    expect(screen.getByText('New Application')).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Software Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ApplicationToast application={mockApplication} onDismiss={onDismiss} />
    );
    await user.click(
      screen.getByRole('button', { name: 'Dismiss notification' })
    );
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after specified duration', () => {
    const onDismiss = vi.fn();
    render(
      <ApplicationToast
        application={mockApplication}
        onDismiss={onDismiss}
        autoDismissMs={5000}
      />
    );
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('uses default 8s auto-dismiss', () => {
    const onDismiss = vi.fn();
    render(
      <ApplicationToast application={mockApplication} onDismiss={onDismiss} />
    );

    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows fallback text when position_title is null', () => {
    const app = { ...mockApplication, position_title: null };
    render(<ApplicationToast application={app} onDismiss={vi.fn()} />);
    expect(screen.getByText(/a position/)).toBeInTheDocument();
  });

  it('clears timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <ApplicationToast application={mockApplication} onDismiss={onDismiss} />
    );
    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
