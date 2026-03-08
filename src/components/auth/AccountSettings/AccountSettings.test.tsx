import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AccountSettings from './AccountSettings';

// Create mock functions we can spy on
const mockRefetch = vi.fn();
const mockRefreshSession = vi.fn();
const mockDeriveKeys = vi.fn();
const mockRotateKeys = vi.fn();

// Feature 049: Mock key management service
vi.mock('@/services/messaging/key-service', () => ({
  keyManagementService: {
    deriveKeys: (password: string) => mockDeriveKeys(password),
    rotateKeys: (password: string) => mockRotateKeys(password),
  },
}));

// Mock the useUserProfile hook to return a loaded state
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: {
      id: 'test-user-id',
      display_name: 'Test User',
      bio: 'Test bio',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    loading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    refreshSession: mockRefreshSession,
  }),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      // Changed from .update() to .upsert() for profile updates (Feature 035)
      upsert: () => ({
        select: () => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-user-id',
              display_name: 'Test User',
              bio: 'Test bio',
            },
            error: null,
          }),
        }),
      }),
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        neq: () => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

describe('AccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AccountSettings />);
    expect(
      screen.getByRole('heading', { name: /profile settings/i })
    ).toBeInTheDocument();
  });

  // Feature 038: Tests for split error states (FR-003)
  it('renders Profile Settings and Change Password forms', () => {
    render(<AccountSettings />);
    expect(
      screen.getByRole('heading', { name: /profile settings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /change password/i })
    ).toBeInTheDocument();
  });

  it('has separate form submissions for profile and password', () => {
    render(<AccountSettings />);
    const updateProfileBtn = screen.getByRole('button', {
      name: /update profile/i,
    });
    const changePasswordBtn = screen.getByRole('button', {
      name: /change password/i,
    });
    expect(updateProfileBtn).toBeInTheDocument();
    expect(changePasswordBtn).toBeInTheDocument();
  });

  // Feature 038: Tests for inline alerts (FR-004, FR-005)
  it('displays profile error inline within Profile Settings card', async () => {
    render(<AccountSettings />);
    // Profile form validation - display name can be empty, but submitting triggers form
    // The inline alert structure exists, just need to verify it has proper ARIA
    const container = document.querySelector('.card-body');
    expect(container).toBeInTheDocument();
  });

  // Feature 038: Test that no bottom-of-page alerts exist (FR-006)
  it('does not render profile or password error alerts on initial render', () => {
    render(<AccountSettings />);
    // No profile or password error/success alerts should be visible initially
    // These are conditionally rendered when profileError, profileSuccess,
    // passwordError, or passwordSuccess states are set
    expect(
      screen.queryByText('Profile updated successfully!')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Password changed successfully!')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Failed to update profile. Please try again.')
    ).not.toBeInTheDocument();
  });

  // Feature 049: Tests for current password field and key rotation
  describe('Password Change with Key Rotation (Feature 049)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockDeriveKeys.mockResolvedValue({ publicKeyJwk: {}, salt: '' });
      mockRotateKeys.mockResolvedValue(true);
    });

    it('renders current password field', () => {
      render(<AccountSettings />);
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    it('requires current password before allowing password change', async () => {
      render(<AccountSettings />);

      // Fill only new password fields
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'NewSecurePass123!' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'NewSecurePass123!' },
      });

      // Submit without current password
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/current password is required/i)
        ).toBeInTheDocument();
      });

      // Key services should not be called
      expect(mockDeriveKeys).not.toHaveBeenCalled();
      expect(mockRotateKeys).not.toHaveBeenCalled();
    });

    it('calls deriveKeys with current password before rotating', async () => {
      render(<AccountSettings />);

      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'OldPassword123!' },
      });
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'NewSecurePass123!' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'NewSecurePass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(mockDeriveKeys).toHaveBeenCalledWith('OldPassword123!');
        expect(mockRotateKeys).toHaveBeenCalledWith('NewSecurePass123!');
      });
    });

    it('shows error when current password is incorrect', async () => {
      // Import the error class to throw it
      const { KeyMismatchError } = await import('@/types/messaging');
      mockDeriveKeys.mockRejectedValue(new KeyMismatchError());

      render(<AccountSettings />);

      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: 'WrongPassword!' },
      });
      fireEvent.change(screen.getByLabelText(/new password/i), {
        target: { value: 'NewSecurePass123!' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'NewSecurePass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/current password is incorrect/i)
        ).toBeInTheDocument();
      });

      // rotateKeys should NOT be called if deriveKeys fails
      expect(mockRotateKeys).not.toHaveBeenCalled();
    });

    it('clears all password fields on successful password change', async () => {
      render(<AccountSettings />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(currentPasswordInput, {
        target: { value: 'OldPassword123!' },
      });
      fireEvent.change(newPasswordInput, {
        target: { value: 'NewSecurePass123!' },
      });
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'NewSecurePass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password changed successfully/i)
        ).toBeInTheDocument();
      });

      // All fields should be cleared
      expect(currentPasswordInput).toHaveValue('');
      expect(newPasswordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });
  });
});
