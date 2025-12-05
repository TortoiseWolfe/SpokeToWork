import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationForm from './ApplicationForm';
import type { JobApplication } from '@/types/company';

describe('ApplicationForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const testCompanyId = 'test-company-123';
  const testCompanyName = 'Test Company Inc.';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders create form with empty fields', () => {
      render(
        <ApplicationForm
          companyId={testCompanyId}
          companyName={testCompanyName}
        />
      );

      expect(screen.getByText('Add Job Application')).toBeInTheDocument();
      expect(screen.getByText(`for ${testCompanyName}`)).toBeInTheDocument();
      expect(screen.getByLabelText(/position title/i)).toHaveValue('');
      expect(screen.getByLabelText(/job posting link/i)).toHaveValue('');
    });

    it('has default values for selects', () => {
      render(<ApplicationForm companyId={testCompanyId} />);

      expect(screen.getByLabelText(/work location/i)).toHaveValue('on_site');
      expect(screen.getByLabelText(/status/i)).toHaveValue('not_applied');
      expect(screen.getByLabelText(/outcome/i)).toHaveValue('pending');
      expect(screen.getByLabelText(/priority/i)).toHaveValue('3');
    });

    it('submits create data correctly', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);

      render(
        <ApplicationForm companyId={testCompanyId} onSubmit={mockOnSubmit} />
      );

      await user.type(
        screen.getByLabelText(/position title/i),
        'Software Engineer'
      );
      await user.selectOptions(
        screen.getByLabelText(/work location/i),
        'remote'
      );
      await user.selectOptions(screen.getByLabelText(/status/i), 'applied');

      await user.click(
        screen.getByRole('button', { name: /add application/i })
      );

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            company_id: testCompanyId,
            position_title: 'Software Engineer',
            work_location_type: 'remote',
            status: 'applied',
          })
        );
      });
    });
  });

  describe('Edit Mode', () => {
    const existingApplication: JobApplication = {
      id: 'app-123',
      company_id: testCompanyId,
      user_id: 'user-123',
      position_title: 'Senior Developer',
      job_link: 'https://example.com/jobs/123',
      work_location_type: 'hybrid',
      status: 'interviewing',
      outcome: 'pending',
      date_applied: '2024-01-15',
      interview_date: '2024-01-20T10:00:00.000Z',
      follow_up_date: '2024-01-25',
      priority: 2,
      notes: 'Initial phone screen went well',
      is_active: true,
      created_at: '2024-01-10T00:00:00.000Z',
      updated_at: '2024-01-15T00:00:00.000Z',
    };

    it('renders edit form with existing data', () => {
      render(
        <ApplicationForm
          companyId={testCompanyId}
          application={existingApplication}
        />
      );

      expect(screen.getByText('Edit Application')).toBeInTheDocument();
      expect(screen.getByLabelText(/position title/i)).toHaveValue(
        'Senior Developer'
      );
      expect(screen.getByLabelText(/job posting link/i)).toHaveValue(
        'https://example.com/jobs/123'
      );
      expect(screen.getByLabelText(/work location/i)).toHaveValue('hybrid');
      expect(screen.getByLabelText(/status/i)).toHaveValue('interviewing');
      expect(screen.getByLabelText(/priority/i)).toHaveValue('2');
    });

    it('submits update data with id', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValueOnce(undefined);

      render(
        <ApplicationForm
          companyId={testCompanyId}
          application={existingApplication}
          onSubmit={mockOnSubmit}
        />
      );

      await user.clear(screen.getByLabelText(/position title/i));
      await user.type(
        screen.getByLabelText(/position title/i),
        'Lead Developer'
      );

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'app-123',
            position_title: 'Lead Developer',
          })
        );
      });
    });
  });

  describe('URL Validation', () => {
    it('shows error for invalid URL', async () => {
      const user = userEvent.setup();
      render(<ApplicationForm companyId={testCompanyId} />);

      await user.type(screen.getByLabelText(/job posting link/i), 'not-a-url');

      expect(
        await screen.findByText(/please enter a valid url/i)
      ).toBeInTheDocument();
    });

    it('accepts valid URL', async () => {
      const user = userEvent.setup();
      render(<ApplicationForm companyId={testCompanyId} />);

      await user.type(
        screen.getByLabelText(/job posting link/i),
        'https://example.com/job'
      );

      expect(
        screen.queryByText(/please enter a valid url/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel clicked', async () => {
      const user = userEvent.setup();
      render(
        <ApplicationForm companyId={testCompanyId} onCancel={mockOnCancel} />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not render cancel button without onCancel', () => {
      render(<ApplicationForm companyId={testCompanyId} />);

      expect(
        screen.queryByRole('button', { name: /cancel/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(submitPromise);

      render(
        <ApplicationForm companyId={testCompanyId} onSubmit={mockOnSubmit} />
      );

      await user.click(
        screen.getByRole('button', { name: /add application/i })
      );

      expect(screen.getByText(/adding/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();

      resolveSubmit!();
    });
  });

  describe('Error Handling', () => {
    it('displays submit error', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce(new Error('Save failed'));

      render(
        <ApplicationForm companyId={testCompanyId} onSubmit={mockOnSubmit} />
      );

      await user.click(
        screen.getByRole('button', { name: /add application/i })
      );

      expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
    });
  });
});
