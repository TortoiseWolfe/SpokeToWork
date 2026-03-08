/**
 * AdminModerationQueue Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T112 [US7] - Tests for AdminModerationQueue component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminModerationQueue from './AdminModerationQueue';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';

const mockContributions: ModerationQueueItem[] = [
  {
    id: 'contrib-1',
    type: 'contribution',
    user_id: 'user-1',
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
    private_company_id: 'private-1',
    private_company_name: 'New Startup Inc',
  },
  {
    id: 'contrib-2',
    type: 'contribution',
    user_id: 'user-2',
    status: 'pending',
    created_at: '2024-01-16T10:00:00Z',
    private_company_id: 'private-2',
    private_company_name: 'Another Corp',
  },
];

const mockEditSuggestions: ModerationQueueItem[] = [
  {
    id: 'edit-1',
    type: 'edit_suggestion',
    user_id: 'user-1',
    status: 'pending',
    created_at: '2024-01-17T10:00:00Z',
    shared_company_id: 'shared-1',
    shared_company_name: 'Existing Company',
    field_name: 'website',
    old_value: 'https://old.example.com',
    new_value: 'https://new.example.com',
    reason: 'URL has changed',
  },
];

describe('AdminModerationQueue', () => {
  const mockOnApproveContribution = vi.fn();
  const mockOnRejectContribution = vi.fn();
  const mockOnMergeContribution = vi.fn();
  const mockOnApproveEdit = vi.fn();
  const mockOnRejectEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T112: displays pending items', () => {
    it('shows contributions section with count', () => {
      render(
        <AdminModerationQueue
          items={mockContributions}
          onApproveContribution={mockOnApproveContribution}
          onRejectContribution={mockOnRejectContribution}
        />
      );

      expect(screen.getByText('Company Contributions (2)')).toBeInTheDocument();
      expect(screen.getByText('New Startup Inc')).toBeInTheDocument();
      expect(screen.getByText('Another Corp')).toBeInTheDocument();
    });

    it('shows edit suggestions section with field changes', () => {
      render(
        <AdminModerationQueue
          items={mockEditSuggestions}
          onApproveEdit={mockOnApproveEdit}
          onRejectEdit={mockOnRejectEdit}
        />
      );

      expect(screen.getByText('Edit Suggestions (1)')).toBeInTheDocument();
      expect(screen.getByText('Existing Company')).toBeInTheDocument();
      expect(screen.getByText('website')).toBeInTheDocument();
      expect(screen.getByText('https://old.example.com')).toBeInTheDocument();
      expect(screen.getByText('https://new.example.com')).toBeInTheDocument();
      expect(screen.getByText(/URL has changed/)).toBeInTheDocument();
    });

    it('shows empty state when no items', () => {
      render(<AdminModerationQueue items={[]} />);

      expect(
        screen.getByText('No pending items to review.')
      ).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<AdminModerationQueue items={[]} isLoading />);

      expect(
        screen.getByLabelText('Loading moderation queue')
      ).toBeInTheDocument();
    });

    it('shows combined queue with both types', () => {
      render(
        <AdminModerationQueue
          items={[...mockContributions, ...mockEditSuggestions]}
          onApproveContribution={mockOnApproveContribution}
          onRejectContribution={mockOnRejectContribution}
          onApproveEdit={mockOnApproveEdit}
          onRejectEdit={mockOnRejectEdit}
        />
      );

      expect(screen.getByText('Company Contributions (2)')).toBeInTheDocument();
      expect(screen.getByText('Edit Suggestions (1)')).toBeInTheDocument();
    });
  });

  describe('T115: approve contribution action', () => {
    it('calls onApproveContribution when approve button clicked', async () => {
      mockOnApproveContribution.mockResolvedValue(undefined);

      render(
        <AdminModerationQueue
          items={mockContributions}
          onApproveContribution={mockOnApproveContribution}
        />
      );

      const approveButtons = screen.getAllByRole('button', {
        name: /approve/i,
      });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockOnApproveContribution).toHaveBeenCalledWith('contrib-1');
      });
    });

    it('shows loading spinner while processing', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise: () => void = () => {};
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnApproveContribution.mockReturnValue(pendingPromise);

      render(
        <AdminModerationQueue
          items={mockContributions}
          onApproveContribution={mockOnApproveContribution}
        />
      );

      const approveButton = screen.getAllByRole('button', {
        name: /approve/i,
      })[0];
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(
          screen.getByTestId('contribution-contrib-1').querySelector('.loading')
        ).toBeInTheDocument();
      });

      resolvePromise();
    });
  });

  describe('T116: reject contribution action', () => {
    it('expands rejection form when reject clicked', () => {
      render(
        <AdminModerationQueue
          items={mockContributions}
          onRejectContribution={mockOnRejectContribution}
        />
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(
        screen.getByPlaceholderText('Reason for rejection (required)')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Confirm Rejection' })
      ).toBeInTheDocument();
    });

    it('requires notes before confirming rejection', async () => {
      render(
        <AdminModerationQueue
          items={mockContributions}
          onRejectContribution={mockOnRejectContribution}
        />
      );

      // Click reject to expand
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      fireEvent.click(rejectButtons[0]);

      // Confirm button should be disabled without notes
      const confirmButton = screen.getByRole('button', {
        name: 'Confirm Rejection',
      });
      expect(confirmButton).toBeDisabled();

      // Type rejection reason
      const textarea = screen.getByPlaceholderText(
        'Reason for rejection (required)'
      );
      fireEvent.change(textarea, { target: { value: 'Duplicate entry' } });

      // Now button should be enabled
      expect(confirmButton).not.toBeDisabled();
    });

    it('calls onRejectContribution with notes', async () => {
      mockOnRejectContribution.mockResolvedValue(undefined);

      render(
        <AdminModerationQueue
          items={mockContributions}
          onRejectContribution={mockOnRejectContribution}
        />
      );

      // Click reject to expand
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      fireEvent.click(rejectButtons[0]);

      // Type rejection reason
      const textarea = screen.getByPlaceholderText(
        'Reason for rejection (required)'
      );
      fireEvent.change(textarea, { target: { value: 'Invalid company data' } });

      // Confirm rejection
      const confirmButton = screen.getByRole('button', {
        name: 'Confirm Rejection',
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnRejectContribution).toHaveBeenCalledWith(
          'contrib-1',
          'Invalid company data'
        );
      });
    });

    it('collapses rejection form on cancel', () => {
      render(
        <AdminModerationQueue
          items={mockContributions}
          onRejectContribution={mockOnRejectContribution}
        />
      );

      // Click reject to expand
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(
        screen.getByPlaceholderText('Reason for rejection (required)')
      ).toBeInTheDocument();

      // Click cancel
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(
        screen.queryByPlaceholderText('Reason for rejection (required)')
      ).not.toBeInTheDocument();
    });
  });

  describe('T118: approve edit suggestion action', () => {
    it('calls onApproveEdit when approve button clicked', async () => {
      mockOnApproveEdit.mockResolvedValue(undefined);

      render(
        <AdminModerationQueue
          items={mockEditSuggestions}
          onApproveEdit={mockOnApproveEdit}
        />
      );

      const approveButton = screen.getByRole('button', {
        name: /approve edit for existing company/i,
      });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockOnApproveEdit).toHaveBeenCalledWith('edit-1');
      });
    });
  });

  describe('T119: reject edit suggestion action', () => {
    it('calls onRejectEdit with notes', async () => {
      mockOnRejectEdit.mockResolvedValue(undefined);

      render(
        <AdminModerationQueue
          items={mockEditSuggestions}
          onRejectEdit={mockOnRejectEdit}
        />
      );

      // Click reject to expand
      const rejectButton = screen.getByRole('button', {
        name: /reject edit for existing company/i,
      });
      fireEvent.click(rejectButton);

      // Type rejection reason
      const textarea = screen.getByPlaceholderText(
        'Reason for rejection (required)'
      );
      fireEvent.change(textarea, { target: { value: 'URL not verified' } });

      // Confirm rejection
      const confirmButton = screen.getByRole('button', {
        name: 'Confirm Rejection',
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnRejectEdit).toHaveBeenCalledWith(
          'edit-1',
          'URL not verified'
        );
      });
    });
  });

  describe('accessibility', () => {
    it('has accessible section headings', () => {
      render(
        <AdminModerationQueue
          items={[...mockContributions, ...mockEditSuggestions]}
        />
      );

      expect(
        screen.getByRole('heading', { name: /company contributions/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /edit suggestions/i })
      ).toBeInTheDocument();
    });

    it('has accessible button labels', () => {
      render(<AdminModerationQueue items={mockContributions} />);

      expect(
        screen.getByRole('button', { name: 'Approve New Startup Inc' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Reject New Startup Inc' })
      ).toBeInTheDocument();
    });

    it('has accessible textarea labels', () => {
      render(
        <AdminModerationQueue
          items={mockContributions}
          onRejectContribution={mockOnRejectContribution}
        />
      );

      // Expand rejection form
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(screen.getByLabelText('Rejection reason')).toBeInTheDocument();
    });
  });
});
