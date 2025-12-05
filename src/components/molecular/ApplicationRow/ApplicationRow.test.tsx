import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationRow from './ApplicationRow';
import type { JobApplication } from '@/types/company';

const mockApplication: JobApplication = {
  id: 'app-123',
  company_id: 'company-456',
  user_id: 'user-789',
  position_title: 'Senior Software Engineer',
  job_link: 'https://example.com/jobs/123',
  work_location_type: 'hybrid',
  status: 'interviewing',
  outcome: 'pending',
  date_applied: '2024-01-15',
  interview_date: '2024-01-25T10:00:00.000Z',
  follow_up_date: '2024-01-30',
  priority: 2,
  notes: 'Interview scheduled',
  is_active: true,
  created_at: '2024-01-10T00:00:00.000Z',
  updated_at: '2024-01-20T00:00:00.000Z',
};

// Wrapper to provide table context
const TableWrapper = ({ children }: { children: React.ReactNode }) => (
  <table>
    <tbody>{children}</tbody>
  </table>
);

describe('ApplicationRow', () => {
  const mockOnClick = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnStatusChange = vi.fn();
  const mockOnOutcomeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders application data correctly', () => {
    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} />
      </TableWrapper>
    );

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
    expect(screen.getByText('View Job')).toBeInTheDocument();
  });

  it('displays status badge', () => {
    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} />
      </TableWrapper>
    );

    expect(screen.getByText('Interviewing')).toBeInTheDocument();
  });

  it('displays outcome badge', () => {
    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} />
      </TableWrapper>
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows priority indicator for high priority', () => {
    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} />
      </TableWrapper>
    );

    expect(screen.getByTitle('Priority 2')).toBeInTheDocument();
  });

  it('calls onClick when row clicked', async () => {
    const user = userEvent.setup();

    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} onClick={mockOnClick} />
      </TableWrapper>
    );

    await user.click(screen.getByTestId('application-row'));
    expect(mockOnClick).toHaveBeenCalledWith(mockApplication);
  });

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup();

    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} onEdit={mockOnEdit} />
      </TableWrapper>
    );

    await user.click(screen.getByLabelText(/edit/i));
    expect(mockOnEdit).toHaveBeenCalledWith(mockApplication);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup();

    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} onDelete={mockOnDelete} />
      </TableWrapper>
    );

    await user.click(screen.getByLabelText(/delete/i));
    expect(mockOnDelete).toHaveBeenCalledWith(mockApplication);
  });

  it('shows status dropdown when onStatusChange provided', () => {
    render(
      <TableWrapper>
        <ApplicationRow
          application={mockApplication}
          onStatusChange={mockOnStatusChange}
        />
      </TableWrapper>
    );

    expect(screen.getByLabelText(/change status/i)).toBeInTheDocument();
  });

  it('calls onStatusChange when status changed', async () => {
    const user = userEvent.setup();

    render(
      <TableWrapper>
        <ApplicationRow
          application={mockApplication}
          onStatusChange={mockOnStatusChange}
        />
      </TableWrapper>
    );

    await user.selectOptions(screen.getByLabelText(/change status/i), 'offer');
    expect(mockOnStatusChange).toHaveBeenCalledWith(mockApplication, 'offer');
  });

  it('shows outcome dropdown when onOutcomeChange provided', () => {
    render(
      <TableWrapper>
        <ApplicationRow
          application={mockApplication}
          onOutcomeChange={mockOnOutcomeChange}
        />
      </TableWrapper>
    );

    expect(screen.getByLabelText(/change outcome/i)).toBeInTheDocument();
  });

  it('shows company name when showCompany is true', () => {
    render(
      <TableWrapper>
        <ApplicationRow
          application={mockApplication}
          showCompany={true}
          companyName="Test Company"
        />
      </TableWrapper>
    );

    expect(screen.getByText('Test Company')).toBeInTheDocument();
  });

  it('applies inactive styling when not active', () => {
    const inactiveApp = { ...mockApplication, is_active: false };

    render(
      <TableWrapper>
        <ApplicationRow application={inactiveApp} />
      </TableWrapper>
    );

    expect(screen.getByTestId('application-row')).toHaveClass('opacity-60');
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('applies selected styling when isSelected', () => {
    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} isSelected={true} />
      </TableWrapper>
    );

    expect(screen.getByTestId('application-row')).toHaveClass('active');
  });

  it('shows fallback text for untitled position', () => {
    const untitledApp = { ...mockApplication, position_title: null };

    render(
      <TableWrapper>
        <ApplicationRow application={untitledApp} />
      </TableWrapper>
    );

    expect(screen.getByText('Untitled Position')).toBeInTheDocument();
  });

  it('job link opens in new tab', () => {
    render(
      <TableWrapper>
        <ApplicationRow application={mockApplication} />
      </TableWrapper>
    );

    const jobLink = screen.getByText('View Job');
    expect(jobLink).toHaveAttribute('target', '_blank');
    expect(jobLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
