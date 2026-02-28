import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApplicationRealtime } from '../useApplicationRealtime';

const mockOn = vi.fn();
const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
const mockChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockOn.mockReturnValue({ subscribe: mockSubscribe });
  mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
  mockChannel.mockReturnValue({ on: mockOn });
});

describe('useApplicationRealtime', () => {
  it('subscribes to realtime channel with correct filter', () => {
    const onUpdate = vi.fn();
    renderHook(() => useApplicationRealtime('user-123', onUpdate));

    expect(mockChannel).toHaveBeenCalledWith(
      'worker-application-updates-user-123'
    );
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'job_applications',
        filter: 'user_id=eq.user-123',
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('calls onUpdate when UPDATE event received', () => {
    const onUpdate = vi.fn();
    renderHook(() => useApplicationRealtime('user-123', onUpdate));

    // Extract the callback passed to .on()
    const callback = mockOn.mock.calls[0][2];
    const mockPayload = {
      new: { id: 'app-1', status: 'interviewing', outcome: 'pending' },
    };
    callback(mockPayload);

    expect(onUpdate).toHaveBeenCalledWith(mockPayload.new);
  });

  it('cleans up channel on unmount', () => {
    const onUpdate = vi.fn();
    const subscribeResult = { unsubscribe: vi.fn() };
    mockSubscribe.mockReturnValue(subscribeResult);

    const { unmount } = renderHook(() =>
      useApplicationRealtime('user-123', onUpdate)
    );
    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(subscribeResult);
  });

  it('does nothing when userId is undefined', () => {
    const onUpdate = vi.fn();
    renderHook(() => useApplicationRealtime(undefined, onUpdate));

    expect(mockChannel).not.toHaveBeenCalled();
    expect(mockOn).not.toHaveBeenCalled();
  });
});
