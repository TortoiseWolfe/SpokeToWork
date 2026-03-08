import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// .from().select().eq().single() chain
const mockSingle = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  },
}));

import { useAdminGate } from './useAdminGate';

describe('useAdminGate', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSingle.mockReset();
    mockUseAuth.mockReset();
  });

  it('starts loading while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    const { result } = renderHook(() => useAdminGate());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('redirects to /sign-in when auth settles with no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderHook(() => useAdminGate());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/sign-in'));
  });

  it('resolves isAdmin=true when profile has is_admin', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false });
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null });
    const { result } = renderHook(() => useAdminGate());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('resolves isAdmin=false when profile lacks is_admin', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u2' }, isLoading: false });
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
    const { result } = renderHook(() => useAdminGate());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('resolves isAdmin=false on PGRST116 (no profile row)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u3' }, isLoading: false });
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const { result } = renderHook(() => useAdminGate());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });
});
