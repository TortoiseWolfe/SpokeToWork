/**
 * Unit Tests for AuthContext.tsx
 * Feature 052 - Test Coverage Expansion
 *
 * Tests auth state management, sign-in/out, and session handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

// IMPORTANT: Unmock AuthContext since we're testing the actual implementation
// The global setup.ts mocks it for component tests, but we need the real thing
// vi.unmock is hoisted (like vi.mock), so it properly overrides setup.ts mock
vi.unmock('@/contexts/AuthContext');

// Store the auth state change callback so we can trigger it in tests
let authStateCallback: ((event: string, session: unknown) => void) | null =
  null;

// Mock functions that will be configured per test
const mockGetSession = vi.fn();
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockRefreshSession = vi.fn();

// Override the global mock from tests/setup.ts with our controllable version
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
  getSupabase: vi.fn(),
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signUp: (params: unknown) => mockSignUp(params),
      signInWithPassword: (params: unknown) => mockSignIn(params),
      signOut: () => mockSignOut(),
      refreshSession: () => mockRefreshSession(),
      onAuthStateChange: (
        callback: (event: string, session: unknown) => void
      ) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      },
    },
  },
}));

// Mock retry utils - needs to actually await the async function
vi.mock('@/lib/auth/retry-utils', () => ({
  retryWithBackoff: vi.fn(async (fn) => {
    return await fn();
  }),
}));

// Mock idle timeout hook
vi.mock('@/hooks/useIdleTimeout', () => ({
  useIdleTimeout: () => ({
    timeRemaining: 1440,
    resetTimer: vi.fn(),
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock IdleTimeoutModal
vi.mock('@/components/molecular/IdleTimeoutModal', () => ({
  default: () => null,
}));

// Import after mocks
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01',
  };

  const mockSession = {
    access_token: 'token-123',
    refresh_token: 'refresh-123',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;

    // Default mock implementations - no session
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignUp.mockResolvedValue({ data: {}, error: null });
    mockSignIn.mockResolvedValue({ data: {}, error: null });
    mockSignOut.mockResolvedValue({ error: null });
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should render children', async () => {
      render(
        <AuthProvider>
          <div data-testid="child">Child Content</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });
    });

    it('should set user when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const TestComponent = () => {
        const { user, isLoading } = useAuth();
        return (
          <div>
            <div data-testid="loading">{String(isLoading)}</div>
            <div data-testid="user">{user?.email ?? 'no-user'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });

    it('should handle getSession error', async () => {
      mockGetSession.mockRejectedValue(new Error('Connection failed'));

      const TestComponent = () => {
        const { error, isLoading } = useAuth();
        return (
          <div>
            <div data-testid="loading">{String(isLoading)}</div>
            <div data-testid="error">{error?.code ?? 'no-error'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('error').textContent).toBe('AUTH_FAILED');
    });
  });

  describe('useAuth hook', () => {
    it('should throw when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const TestComponent = () => {
        useAuth();
        return <div>test</div>;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should return auth context when inside provider', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.signUp).toBeDefined();
      expect(result.current.signIn).toBeDefined();
      expect(result.current.signOut).toBeDefined();
      expect(result.current.refreshSession).toBeDefined();
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp with email and password', async () => {
      mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123');
      });

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
        })
      );
    });

    it('should return error from supabase', async () => {
      mockSignUp.mockResolvedValue({
        data: null,
        error: new Error('Email taken'),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signUpResult: { error: Error | null };
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'pass');
      });

      expect(signUpResult!.error?.message).toBe('Email taken');
    });
  });

  describe('signIn', () => {
    it('should call supabase signInWithPassword', async () => {
      mockSignIn.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSignOut.mockResolvedValue({ error: null });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('refreshSession', () => {
    it('should call supabase refreshSession', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(mockRefreshSession).toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('should be true when user exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should be false when no session', async () => {
      // Explicitly ensure no session
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // After loading is complete, check isAuthenticated
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('onAuthStateChange callback', () => {
    it('should update state when auth state changes', async () => {
      // Start with no session
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial state - no user
      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      // Trigger auth state change to simulate sign in
      await act(async () => {
        if (authStateCallback) {
          authStateCallback('SIGNED_IN', mockSession);
        }
      });

      // Now should have user
      await waitFor(() => {
        expect(result.current.user?.email).toBe('test@example.com');
      });
    });
  });
});
