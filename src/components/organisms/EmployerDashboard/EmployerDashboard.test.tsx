import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployerDashboard from './EmployerDashboard';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

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

describe('EmployerDashboard', () => {
  const defaultProps = {
    applications: [mockApplication()],
    loading: false,
    error: null,
    onUpdateStatus: vi.fn().mockResolvedValue(undefined),
    onRefresh: vi.fn().mockResolvedValue(undefined),
  };

  it('renders loading spinner when loading', () => {
    render(<EmployerDashboard {...defaultProps} loading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error alert with retry button', () => {
    render(
      <EmployerDashboard {...defaultProps} error="Something went wrong" />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('calls onRefresh when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <EmployerDashboard
        {...defaultProps}
        error="Something went wrong"
        onRefresh={onRefresh}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('renders empty state when no applications', () => {
    render(<EmployerDashboard {...defaultProps} applications={[]} />);
    expect(screen.getByText('No applications yet')).toBeInTheDocument();
  });

  it('renders applications table with data', () => {
    render(<EmployerDashboard {...defaultProps} />);
    expect(
      screen.getByRole('table', { name: 'Job applications' })
    ).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  it('renders status filter badges with counts', () => {
    const apps = [
      mockApplication({ id: '1', status: 'applied' }),
      mockApplication({ id: '2', status: 'applied' }),
      mockApplication({ id: '3', status: 'screening' }),
    ];
    render(<EmployerDashboard {...defaultProps} applications={apps} />);

    const statusGroup = screen.getByRole('group', {
      name: 'Application status counts',
    });
    expect(statusGroup).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All/ })).toBeInTheDocument();
  });

  it('filters applications when status badge is clicked', async () => {
    const user = userEvent.setup();
    const apps = [
      mockApplication({ id: '1', status: 'applied', applicant_name: 'Alice' }),
      mockApplication({
        id: '2',
        status: 'screening',
        applicant_name: 'Bob',
      }),
    ];
    render(<EmployerDashboard {...defaultProps} applications={apps} />);

    // Click the Screening badge in the stats bar
    const statusBar = screen.getByRole('group', {
      name: 'Application status counts',
    });
    const screeningBadge = within(statusBar).getByRole('button', {
      name: /^Screening/,
    });
    await user.click(screeningBadge);

    // Only Bob should be visible
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('calls onUpdateStatus when advance button is clicked', async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn().mockResolvedValue(undefined);
    render(
      <EmployerDashboard {...defaultProps} onUpdateStatus={onUpdateStatus} />
    );

    const advanceButton = screen.getByRole('button', {
      name: /Advance Jane Doe to Screening/,
    });
    await user.click(advanceButton);
    expect(onUpdateStatus).toHaveBeenCalledWith('app-1', 'screening');
  });

  it('does not show advance button for closed applications', () => {
    const apps = [mockApplication({ status: 'closed' })];
    render(<EmployerDashboard {...defaultProps} applications={apps} />);

    const rows = screen.getAllByTestId('application-row');
    const lastCell = within(rows[0]).getAllByRole('cell').pop()!;
    expect(lastCell.querySelector('button')).toBeNull();
  });

  it('shows "Not specified" for missing position title', () => {
    const apps = [mockApplication({ position_title: null })];
    render(<EmployerDashboard {...defaultProps} applications={apps} />);
    expect(screen.getByText('Not specified')).toBeInTheDocument();
  });

  it('toggles filter off when clicking active badge', async () => {
    const user = userEvent.setup();
    const apps = [
      mockApplication({ id: '1', status: 'applied', applicant_name: 'Alice' }),
      mockApplication({
        id: '2',
        status: 'screening',
        applicant_name: 'Bob',
      }),
    ];
    render(<EmployerDashboard {...defaultProps} applications={apps} />);

    // Use within() to scope to the stats bar
    const statusBar = screen.getByRole('group', {
      name: 'Application status counts',
    });
    const appliedBadge = within(statusBar).getByRole('button', {
      name: /^Applied/,
    });
    // Enable filter
    await user.click(appliedBadge);
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();

    // Click again to disable filter
    await user.click(appliedBadge);
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  // --- Pagination + full-dataset meta props ------------------------------

  it('renders load-more button when hasMore is true', () => {
    render(
      <EmployerDashboard
        {...defaultProps}
        hasMore
        totalCount={50}
        onLoadMore={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const btn = screen.getByRole('button', { name: 'Load more applications' });
    expect(btn).toHaveTextContent('Load more (1 of 50)');
    expect(btn).toBeEnabled();
  });

  it('does not render load-more button when hasMore is false', () => {
    render(<EmployerDashboard {...defaultProps} hasMore={false} />);
    expect(
      screen.queryByRole('button', { name: 'Load more applications' })
    ).not.toBeInTheDocument();
  });

  it('calls onLoadMore when load-more button is clicked', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn().mockResolvedValue(undefined);
    render(
      <EmployerDashboard
        {...defaultProps}
        hasMore
        totalCount={50}
        onLoadMore={onLoadMore}
      />
    );
    await user.click(
      screen.getByRole('button', { name: 'Load more applications' })
    );
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables load-more button and shows spinner when loadingMore', () => {
    render(
      <EmployerDashboard
        {...defaultProps}
        hasMore
        loadingMore
        totalCount={50}
        onLoadMore={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const btn = screen.getByRole('button', { name: 'Load more applications' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Loading');
  });

  it('uses statusCounts prop for badge numbers instead of loaded applications', () => {
    // Only 1 app loaded, but full dataset has 42 applied. The badge should
    // show 42 (funnel reflects full dataset, not just the visible page).
    render(
      <EmployerDashboard
        {...defaultProps}
        applications={[mockApplication({ status: 'applied' })]}
        statusCounts={{ applied: 42, screening: 7 }}
        totalCount={50}
      />
    );
    const statusBar = screen.getByRole('group', {
      name: 'Application status counts',
    });
    const appliedBadge = within(statusBar).getByRole('button', {
      name: /^Applied/,
    });
    expect(appliedBadge).toHaveTextContent('42');
    const allBadge = within(statusBar).getByRole('button', { name: /^All/ });
    expect(allBadge).toHaveTextContent('50');
  });

  it('uses repeatUserIds prop for isRepeat badge instead of loaded applications', () => {
    // user-1 appears once on this page, but repeatUserIds says they have
    // more applications on a not-yet-loaded page → still flagged as repeat.
    render(
      <EmployerDashboard
        {...defaultProps}
        applications={[mockApplication({ user_id: 'user-1' })]}
        repeatUserIds={new Set(['user-1'])}
      />
    );
    // ApplicationRow renders a "Repeat" badge when isRepeat is true.
    expect(screen.getByText(/repeat/i)).toBeInTheDocument();
  });
});
