/**
 * Tests for useEmployerRealtimeSync
 *
 * Verifies:
 * - Subscription activates when companyIds is non-empty
 * - Subscription does NOT activate with empty companyIds (the old bug)
 * - Only processes INSERTs for the employer's own companies
 * - Ignores INSERTs for unrelated companies
 * - Cleans up channel on unmount
 * - Re-subscribes when companyIds change
 * - Updates meta counters and alert state on new application
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmployerRealtimeSync } from '../useEmployerRealtimeSync';
import type { RealtimeSyncCallbacks } from '../useEmployerRealtimeSync';

// --- Supabase mock plumbing --------------------------------------------------

const mockUnsubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
let realtimeCallback: ((payload: { new: Record<string, unknown> }) => void) | undefined;

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe });
const mockOn = vi.fn().mockImplementation((_event: string, _filter: unknown, cb: typeof realtimeCallback) => {
  realtimeCallback = cb;
  return { subscribe: mockSubscribe };
});
const mockChannel = vi.fn().mockReturnValue({ on: mockOn, unsubscribe: mockUnsubscribe });

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    from: mockFrom,
  }),
}));

// --- Helpers -----------------------------------------------------------------

function makeCallbacks(overrides?: Partial<RealtimeSyncCallbacks>): RealtimeSyncCallbacks {
  return {
    applicationsRef: { current: [] },
    setApplications: vi.fn(),
    offsetRef: { current: 0 },
    userIdCountsRef: { current: new Map() },
    setTotalCount: vi.fn(),
    setStatusCounts: vi.fn(),
    setRepeatUserIds: vi.fn(),
    ...overrides,
  };
}

// --- Tests -------------------------------------------------------------------

describe('useEmployerRealtimeSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = undefined;

    // Default: profile + company lookups return data
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { display_name: 'Jane Doe', username: 'jane' }, error: null })
      .mockResolvedValueOnce({ data: { name: 'Acme Corp' }, error: null });
  });

  // ---------- Subscription lifecycle -----------------------------------------

  it('subscribes to realtime channel when companyIds is non-empty', () => {
    const callbacks = makeCallbacks();
    renderHook(() => useEmployerRealtimeSync(['company-1'], callbacks));

    expect(mockChannel).toHaveBeenCalledWith('employer-new-applications');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'job_applications',
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('does NOT subscribe when companyIds is empty (the old bug)', () => {
    const callbacks = makeCallbacks();
    renderHook(() => useEmployerRealtimeSync([], callbacks));

    expect(mockChannel).not.toHaveBeenCalled();
    expect(mockOn).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('cleans up channel on unmount', () => {
    const callbacks = makeCallbacks();
    const { unmount } = renderHook(() =>
      useEmployerRealtimeSync(['company-1'], callbacks)
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('re-subscribes when companyIds change', () => {
    const callbacks = makeCallbacks();
    const { rerender } = renderHook(
      ({ ids }) => useEmployerRealtimeSync(ids, callbacks),
      { initialProps: { ids: ['company-1'] } }
    );

    expect(mockChannel).toHaveBeenCalledTimes(1);

    // Change company IDs — should tear down old channel and create new one
    rerender({ ids: ['company-1', 'company-2'] });

    // Old channel cleaned up + new channel created
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockChannel).toHaveBeenCalledTimes(2);
  });

  // ---------- INSERT filtering -----------------------------------------------

  it('processes INSERT for an owned company', async () => {
    const callbacks = makeCallbacks();
    renderHook(() => useEmployerRealtimeSync(['company-1'], callbacks));

    expect(realtimeCallback).toBeDefined();

    await act(async () => {
      realtimeCallback!({
        new: {
          id: 'app-1',
          shared_company_id: 'company-1',
          user_id: 'applicant-1',
          status: 'applied',
        },
      });
    });

    // Should have enriched and prepended
    expect(callbacks.setApplications).toHaveBeenCalled();
    expect(callbacks.setTotalCount).toHaveBeenCalled();
    expect(callbacks.setStatusCounts).toHaveBeenCalled();
    expect(callbacks.offsetRef.current).toBe(1);
  });

  it('ignores INSERT for an unrelated company', async () => {
    const callbacks = makeCallbacks();
    renderHook(() => useEmployerRealtimeSync(['company-1'], callbacks));

    await act(async () => {
      realtimeCallback!({
        new: {
          id: 'app-2',
          shared_company_id: 'unrelated-company',
          user_id: 'applicant-2',
          status: 'applied',
        },
      });
    });

    // None of the state setters should have been called
    expect(callbacks.setApplications).not.toHaveBeenCalled();
    expect(callbacks.setTotalCount).not.toHaveBeenCalled();
    expect(callbacks.offsetRef.current).toBe(0);
  });

  it('ignores INSERT with null shared_company_id', async () => {
    const callbacks = makeCallbacks();
    renderHook(() => useEmployerRealtimeSync(['company-1'], callbacks));

    await act(async () => {
      realtimeCallback!({
        new: {
          id: 'app-3',
          shared_company_id: null,
          user_id: 'applicant-3',
          status: 'applied',
        },
      });
    });

    expect(callbacks.setApplications).not.toHaveBeenCalled();
  });

  // ---------- Alert state ----------------------------------------------------

  it('sets newApplicationAlert on INSERT and dismisses it', async () => {
    const callbacks = makeCallbacks();
    const { result } = renderHook(() =>
      useEmployerRealtimeSync(['company-1'], callbacks)
    );

    expect(result.current.newApplicationAlert).toBeNull();

    await act(async () => {
      realtimeCallback!({
        new: {
          id: 'app-4',
          shared_company_id: 'company-1',
          user_id: 'applicant-4',
          status: 'applied',
        },
      });
    });

    expect(result.current.newApplicationAlert).not.toBeNull();
    expect(result.current.newApplicationAlert?.id).toBe('app-4');
    expect(result.current.newApplicationAlert?.applicant_name).toBe('Jane Doe');
    expect(result.current.newApplicationAlert?.company_name).toBe('Acme Corp');

    act(() => {
      result.current.dismissAlert();
    });

    expect(result.current.newApplicationAlert).toBeNull();
  });

  // ---------- Meta counter updates -------------------------------------------

  it('detects repeat applicant on second INSERT from same user', async () => {
    const uidCounts = new Map<string, number>([['applicant-5', 1]]);
    const callbacks = makeCallbacks({ userIdCountsRef: { current: uidCounts } });
    renderHook(() => useEmployerRealtimeSync(['company-1'], callbacks));

    // Reset maybeSingle for second call round
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { display_name: 'Repeat User', username: 'repeat' }, error: null })
      .mockResolvedValueOnce({ data: { name: 'Acme Corp' }, error: null });

    await act(async () => {
      realtimeCallback!({
        new: {
          id: 'app-5',
          shared_company_id: 'company-1',
          user_id: 'applicant-5',
          status: 'applied',
        },
      });
    });

    // uid count should have bumped to 2
    expect(uidCounts.get('applicant-5')).toBe(2);
    // setRepeatUserIds should have been called (repeat detected)
    expect(callbacks.setRepeatUserIds).toHaveBeenCalled();
  });
});
