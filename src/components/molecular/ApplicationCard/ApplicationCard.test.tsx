import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ApplicationCard from './ApplicationCard';

const mockApp = {
  id: 'app-1',
  applicant_name: 'Jane Doe',
  company_name: 'Acme Corp',
  position_title: 'Software Engineer',
  status: 'applied' as const,
  date_applied: '2026-02-20',
};

describe('ApplicationCard', () => {
  it('renders applicant name', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders position title', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  it('renders company name', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText(/2\/20\/2026/)).toBeInTheDocument();
  });

  it('renders advance button with correct aria-label', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /advance.*screening/i })
    ).toBeInTheDocument();
  });

  it('calls onAdvance when advance button clicked', async () => {
    const onAdvance = vi.fn();
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={onAdvance}
        onReject={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /advance/i }));
    expect(onAdvance).toHaveBeenCalledWith('app-1');
  });

  it('does not render advance or reject buttons for closed status', () => {
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'closed' }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('button', { name: /advance/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /reject/i })
    ).not.toBeInTheDocument();
  });

  it('shows loading state when updating', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
        updating
      />
    );
    expect(screen.getByRole('button', { name: /advance/i })).toBeDisabled();
  });

  it('shows "Not specified" when position_title is null', () => {
    render(
      <ApplicationCard
        application={{ ...mockApp, position_title: null }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Not specified')).toBeInTheDocument();
  });

  it('uses fallback badge class for unknown status', () => {
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'unknown_status' as any }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    const badge = screen.getByText('unknown_status');
    expect(badge.className).toContain('badge-ghost');
  });

  // Reject button tests

  it('renders reject button with correct aria-label', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /reject jane doe/i })
    ).toBeInTheDocument();
  });

  it('calls onReject when reject button clicked', async () => {
    const onReject = vi.fn();
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={onReject}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /reject/i }));
    expect(onReject).toHaveBeenCalledWith('app-1');
  });

  it('disables reject button when updating', () => {
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
        updating
      />
    );
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('shows rejected badge when outcome is rejected', () => {
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'closed', outcome: 'rejected' }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  // Interview date picker tests

  it('shows date picker instead of advancing when next status is interviewing', async () => {
    const onAdvance = vi.fn();
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'screening' }}
        onAdvance={onAdvance}
        onReject={vi.fn()}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /advance.*interviewing/i })
    );
    expect(onAdvance).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/interview date/i)).toBeInTheDocument();
  });

  it('confirm with date calls onAdvance with interview date', async () => {
    const onAdvance = vi.fn();
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'screening' }}
        onAdvance={onAdvance}
        onReject={vi.fn()}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /advance.*interviewing/i })
    );
    const input = screen.getByLabelText(/interview date/i);
    await userEvent.clear(input);
    await userEvent.type(input, '2026-03-10T14:00');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onAdvance).toHaveBeenCalledWith(
      'app-1',
      expect.stringContaining('2026-03-10')
    );
  });

  it('skip calls onAdvance without interview date', async () => {
    const onAdvance = vi.fn();
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'screening' }}
        onAdvance={onAdvance}
        onReject={vi.fn()}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /advance.*interviewing/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onAdvance).toHaveBeenCalledWith('app-1');
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('advances immediately for non-interviewing transitions', async () => {
    const onAdvance = vi.fn();
    render(
      <ApplicationCard
        application={mockApp}
        onAdvance={onAdvance}
        onReject={vi.fn()}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /advance.*screening/i })
    );
    expect(onAdvance).toHaveBeenCalledWith('app-1');
    expect(screen.queryByLabelText(/interview date/i)).not.toBeInTheDocument();
  });

  it('displays interview date when set', () => {
    render(
      <ApplicationCard
        application={{
          ...mockApp,
          status: 'interviewing',
          interview_date: '2026-03-10T14:00:00Z',
        }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText(/3\/10\/2026/)).toBeInTheDocument();
  });

  it('does not display interview date element when not set', () => {
    render(
      <ApplicationCard
        application={{ ...mockApp, status: 'interviewing' }}
        onAdvance={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.queryByText(/interview:/i)).not.toBeInTheDocument();
  });
});
