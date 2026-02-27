import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationRow from './ApplicationRow';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

const makeApp = (
  over: Partial<EmployerApplication> = {}
): EmployerApplication => ({
  id: 'app-1',
  shared_company_id: 'comp-1',
  private_company_id: null,
  user_id: 'user-1',
  position_title: 'Bike Mechanic',
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
  ...over,
});

const wrap = (ui: React.ReactElement) => (
  <table>
    <tbody>{ui}</tbody>
  </table>
);

describe('ApplicationRow', () => {
  it('renders applicant name, company, position and status badge', () => {
    render(
      wrap(
        <ApplicationRow
          application={makeApp()}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      )
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Bike Mechanic')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toHaveClass('badge');
  });

  it('renders repeat badge when isRepeat is true', () => {
    render(
      wrap(
        <ApplicationRow
          application={makeApp()}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={true}
        />
      )
    );
    expect(screen.getByText(/repeat/i)).toBeInTheDocument();
  });

  it('does not render repeat badge when isRepeat is false', () => {
    render(
      wrap(
        <ApplicationRow
          application={makeApp()}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      )
    );
    expect(screen.queryByText(/repeat/i)).not.toBeInTheDocument();
  });

  it('advance button has aria-label with applicant name and next status', () => {
    render(
      wrap(
        <ApplicationRow
          application={makeApp({ status: 'applied' })}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      )
    );
    // next status after 'applied' is 'screening'
    expect(
      screen.getByRole('button', { name: /Advance Jane Doe to Screening/i })
    ).toBeInTheDocument();
  });

  it('advance button is disabled when updating', () => {
    render(
      wrap(
        <ApplicationRow
          application={makeApp()}
          onAdvance={vi.fn()}
          updating={true}
          isRepeat={false}
        />
      )
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('no advance button for closed status', () => {
    render(
      wrap(
        <ApplicationRow
          application={makeApp({ status: 'closed' })}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      )
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onAdvance with the application when clicked', async () => {
    const onAdvance = vi.fn();
    const app = makeApp();
    const user = userEvent.setup();
    render(
      wrap(
        <ApplicationRow
          application={app}
          onAdvance={onAdvance}
          updating={false}
          isRepeat={false}
        />
      )
    );
    await user.click(screen.getByRole('button'));
    expect(onAdvance).toHaveBeenCalledWith(app);
  });

  it('falls back to Not specified when position_title is null', () => {
    render(
      wrap(
        <ApplicationRow
          application={makeApp({ position_title: null })}
          onAdvance={vi.fn()}
          updating={false}
          isRepeat={false}
        />
      )
    );
    expect(screen.getByText('Not specified')).toBeInTheDocument();
  });
});
