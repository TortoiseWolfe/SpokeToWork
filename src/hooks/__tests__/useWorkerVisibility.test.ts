import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock service methods
const mockGetVisibility = vi.fn();
const mockUpdateVisibility = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/resumes/visibility-service', () => ({
  VisibilityService: class MockVisibilityService {
    getVisibility(userId: string) {
      return mockGetVisibility(userId);
    }
    updateVisibility(userId: string, changes: Record<string, unknown>) {
      return mockUpdateVisibility(userId, changes);
    }
  },
}));

import { useWorkerVisibility } from '../useWorkerVisibility';

const makeVisibility = (overrides = {}) => ({
  user_id: 'u1',
  profile_public: true,
  resume_visible_to: 'none' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('useWorkerVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVisibility.mockResolvedValue(makeVisibility());
    mockUpdateVisibility.mockResolvedValue(undefined);
  });

  it('starts with isLoading true', () => {
    const { result } = renderHook(() => useWorkerVisibility('u1'));
    expect(result.current.isLoading).toBe(true);
  });

  it('loads visibility from service', async () => {
    const { result } = renderHook(() => useWorkerVisibility('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetVisibility).toHaveBeenCalledWith('u1');
    expect(result.current.visibility).toEqual(makeVisibility());
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading false without fetching when userId undefined', async () => {
    const { result } = renderHook(() => useWorkerVisibility(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetVisibility).not.toHaveBeenCalled();
    expect(result.current.visibility).toBeNull();
  });

  it('sets error on load failure', async () => {
    mockGetVisibility.mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useWorkerVisibility('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Fetch failed');
  });

  it('update applies optimistically', async () => {
    const { result } = renderHook(() => useWorkerVisibility('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Start update but don't await — check optimistic state
    let updatePromise: Promise<void>;
    act(() => {
      updatePromise = result.current.update({ profile_public: false });
    });

    // Optimistic: should be applied immediately
    expect(result.current.visibility?.profile_public).toBe(false);

    await act(async () => {
      await updatePromise!;
    });

    expect(mockUpdateVisibility).toHaveBeenCalledWith('u1', { profile_public: false });
    expect(result.current.visibility?.profile_public).toBe(false);
  });

  it('update reverts on error', async () => {
    mockUpdateVisibility.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useWorkerVisibility('u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.update({ profile_public: false });
    });

    // Should be reverted to original
    expect(result.current.visibility?.profile_public).toBe(true);
    expect(result.current.error?.message).toBe('Update failed');
  });

  it('update does nothing when userId undefined', async () => {
    const { result } = renderHook(() => useWorkerVisibility(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.update({ profile_public: false });
    });

    expect(mockUpdateVisibility).not.toHaveBeenCalled();
    expect(result.current.visibility).toBeNull();
  });
});
