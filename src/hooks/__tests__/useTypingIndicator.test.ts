/**
 * Unit Tests for useTypingIndicator Hook
 * Task: T122
 *
 * Tests typing indicator hook with mocked Supabase client and realtime service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTypingIndicator } from '../useTypingIndicator';
import { realtimeService } from '@/lib/messaging/realtime';
import { createClient } from '@/lib/supabase/client';

// Mock dependencies (explicit factories — bare vi.mock() does not prevent
// module body execution, and supabase/client throws if env vars are unset)
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/messaging/realtime', () => ({
  realtimeService: {
    subscribeToTypingIndicators: vi.fn(),
    setTypingStatus: vi.fn(),
  },
}));

describe('useTypingIndicator', () => {
  const mockConversationId = 'test-conversation-id';
  const mockCurrentUserId = 'current-user-id';
  const mockOtherUserId = 'other-user-id';

  let mockSupabase: any;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockCurrentUserId } },
          error: null,
        }),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);

    // Mock realtime service
    mockUnsubscribe = vi.fn();
    (realtimeService.subscribeToTypingIndicators as any).mockReset();
    (realtimeService.subscribeToTypingIndicators as any).mockReturnValue(
      mockUnsubscribe
    );
    (realtimeService.setTypingStatus as any).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with isTyping=false', () => {
    const { result } = renderHook(() => useTypingIndicator(mockConversationId));

    expect(result.current.isTyping).toBe(false);
    expect(result.current.setTyping).toBeInstanceOf(Function);
  });

  it('should subscribe to typing indicators on mount', async () => {
    renderHook(() => useTypingIndicator(mockConversationId));

    await waitFor(() => {
      expect(realtimeService.subscribeToTypingIndicators).toHaveBeenCalledWith(
        mockConversationId,
        expect.any(Function),
        expect.any(Function) // onSubscribed callback (E2E readiness seam)
      );
    });
  });

  it('should unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() =>
      useTypingIndicator(mockConversationId)
    );

    await waitFor(() => {
      expect(realtimeService.subscribeToTypingIndicators).toHaveBeenCalled();
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update isTyping when other user types', async () => {
    let typingCallback:
      | ((userId: string, isTyping: boolean) => void)
      | undefined;

    (realtimeService.subscribeToTypingIndicators as any).mockImplementation(
      (_id: string, callback: (userId: string, isTyping: boolean) => void) => {
        typingCallback = callback;
        return mockUnsubscribe;
      }
    );

    const { result } = renderHook(() => useTypingIndicator(mockConversationId));

    await waitFor(() => {
      expect(typingCallback).toBeDefined();
    });

    // Other user starts typing
    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, true);
      }
    });

    expect(result.current.isTyping).toBe(true);

    // Other user stops typing
    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, false);
      }
    });

    expect(result.current.isTyping).toBe(false);
  });

  it('should ignore own typing status', async () => {
    let typingCallback:
      | ((userId: string, isTyping: boolean) => void)
      | undefined;

    (realtimeService.subscribeToTypingIndicators as any).mockImplementation(
      (_id: string, callback: (userId: string, isTyping: boolean) => void) => {
        typingCallback = callback;
        return mockUnsubscribe;
      }
    );

    const { result } = renderHook(() => useTypingIndicator(mockConversationId));

    await waitFor(() => {
      expect(typingCallback).toBeDefined();
    });

    // Current user typing (should be ignored)
    act(() => {
      if (typingCallback) {
        typingCallback(mockCurrentUserId, true);
      }
    });

    expect(result.current.isTyping).toBe(false);
  });

  it('should call setTypingStatus when setTyping is called', () => {
    const { result } = renderHook(() => useTypingIndicator(mockConversationId));

    act(() => {
      result.current.setTyping(true);
    });

    expect(realtimeService.setTypingStatus).toHaveBeenCalledWith(
      mockConversationId,
      true
    );

    act(() => {
      result.current.setTyping(false);
    });

    expect(realtimeService.setTypingStatus).toHaveBeenCalledWith(
      mockConversationId,
      false
    );
  });

  it('should auto-expire typing indicator after 5 seconds', async () => {
    let typingCallback:
      | ((userId: string, isTyping: boolean) => void)
      | undefined;

    (realtimeService.subscribeToTypingIndicators as any).mockImplementation(
      (_id: string, callback: (userId: string, isTyping: boolean) => void) => {
        typingCallback = callback;
        return mockUnsubscribe;
      }
    );

    const { result } = renderHook(() => useTypingIndicator(mockConversationId));

    await waitFor(() => {
      expect(typingCallback).toBeDefined();
    });

    // Enable fake timers AFTER waitFor completes
    vi.useFakeTimers();

    // Other user starts typing
    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, true);
      }
    });

    expect(result.current.isTyping).toBe(true);

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isTyping).toBe(false);

    vi.useRealTimers();
  });

  it('should clear timeout when typing updates before expiry', async () => {
    let typingCallback:
      | ((userId: string, isTyping: boolean) => void)
      | undefined;

    (realtimeService.subscribeToTypingIndicators as any).mockImplementation(
      (_id: string, callback: (userId: string, isTyping: boolean) => void) => {
        typingCallback = callback;
        return mockUnsubscribe;
      }
    );

    const { result } = renderHook(() => useTypingIndicator(mockConversationId));

    await waitFor(() => {
      expect(typingCallback).toBeDefined();
    });

    // Enable fake timers AFTER waitFor completes
    vi.useFakeTimers();

    // Other user starts typing
    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, true);
      }
    });

    expect(result.current.isTyping).toBe(true);

    // Fast-forward 3 seconds (before expiry)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Another typing update (resets timer)
    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, true);
      }
    });

    expect(result.current.isTyping).toBe(true);

    // Fast-forward another 3 seconds (total 6s, but timer was reset at 3s)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should still be typing (timer reset)
    expect(result.current.isTyping).toBe(true);

    // Fast-forward final 2 seconds (5s from last update)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Now should expire
    expect(result.current.isTyping).toBe(false);

    vi.useRealTimers();
  });

  it('should handle rapid typing/not typing changes', async () => {
    let typingCallback:
      | ((userId: string, isTyping: boolean) => void)
      | undefined;

    (realtimeService.subscribeToTypingIndicators as any).mockImplementation(
      (_id: string, callback: (userId: string, isTyping: boolean) => void) => {
        typingCallback = callback;
        return mockUnsubscribe;
      }
    );

    const { result } = renderHook(() => useTypingIndicator(mockConversationId));

    await waitFor(() => {
      expect(typingCallback).toBeDefined();
    });

    // Rapid changes
    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, true);
      }
    });
    expect(result.current.isTyping).toBe(true);

    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, false);
      }
    });
    expect(result.current.isTyping).toBe(false);

    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, true);
      }
    });
    expect(result.current.isTyping).toBe(true);

    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, false);
      }
    });
    expect(result.current.isTyping).toBe(false);
  });

  it('should clear timeout on unmount', async () => {
    let typingCallback:
      | ((userId: string, isTyping: boolean) => void)
      | undefined;

    (realtimeService.subscribeToTypingIndicators as any).mockImplementation(
      (_id: string, callback: (userId: string, isTyping: boolean) => void) => {
        typingCallback = callback;
        return mockUnsubscribe;
      }
    );

    const { result, unmount } = renderHook(() =>
      useTypingIndicator(mockConversationId)
    );

    await waitFor(() => {
      expect(typingCallback).toBeDefined();
    });

    // Enable fake timers AFTER waitFor completes
    vi.useFakeTimers();

    // Start typing
    act(() => {
      if (typingCallback) {
        typingCallback(mockOtherUserId, true);
      }
    });

    expect(result.current.isTyping).toBe(true);

    // Unmount before timeout expires
    unmount();

    // Fast-forward time (should not throw error)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    vi.useRealTimers();
  });

  /**
   * Regression test for stuck typing indicator after conversation switch.
   *
   * Scenario:
   * 1. User A is viewing conversation 1
   * 2. User B (in conv 1) starts typing → isTyping=true, 5s expiry armed
   * 3. User A switches to conversation 2 (conversationId prop changes)
   * 4. Cleanup runs → clears timeout BUT did not reset isTyping
   * 5. isTyping stays true forever on conversation 2 until a new event arrives
   *
   * This is the root cause of "typing indicator shows someone as typing long
   * after they've stopped".
   */
  it('resets isTyping to false when conversationId changes while indicator is active', async () => {
    let typingCallback:
      | ((userId: string, isTyping: boolean) => void)
      | undefined;

    (realtimeService.subscribeToTypingIndicators as any).mockImplementation(
      (_id: string, callback: (userId: string, isTyping: boolean) => void) => {
        typingCallback = callback;
        return mockUnsubscribe;
      }
    );

    const { result, rerender } = renderHook(
      ({ id }) => useTypingIndicator(id),
      { initialProps: { id: mockConversationId } }
    );

    await waitFor(() => {
      expect(typingCallback).toBeDefined();
    });

    // Other user starts typing in conversation 1
    act(() => {
      typingCallback!(mockOtherUserId, true);
    });
    expect(result.current.isTyping).toBe(true);

    // User switches to conversation 2 (new conversationId)
    rerender({ id: 'different-conversation-id' });

    // isTyping MUST reset — nobody is typing in the new conversation
    expect(result.current.isTyping).toBe(false);
  });

  /**
   * Regression test for stuck typing indicator when sender closes tab/navigates away.
   *
   * The hook's setTyping broadcasts {is_typing:true} on keystrokes. If the user
   * closes the tab or navigates away while typing, the cleanup must broadcast
   * {is_typing:false} so the peer's 5-second auto-expire is not the only escape
   * hatch (it may never arrive if Realtime disconnects first).
   *
   * This is the root cause of "typing indicator shows someone as typing long
   * after they've closed the tab".
   */
  it('broadcasts stop-typing on unmount if setTyping(true) was called', async () => {
    const { result, unmount } = renderHook(() =>
      useTypingIndicator(mockConversationId)
    );

    await waitFor(() => {
      expect(realtimeService.subscribeToTypingIndicators).toHaveBeenCalled();
    });

    // User starts typing (calls setTyping from MessageInput onTypingChange)
    act(() => {
      result.current.setTyping(true);
    });
    expect(realtimeService.setTypingStatus).toHaveBeenCalledWith(
      mockConversationId,
      true
    );

    (realtimeService.setTypingStatus as any).mockClear();

    // Tab closes / user navigates away → unmount
    unmount();

    // Cleanup MUST broadcast stop-typing so peer doesn't see stuck indicator
    expect(realtimeService.setTypingStatus).toHaveBeenCalledWith(
      mockConversationId,
      false
    );
  });

  it('does NOT broadcast stop-typing on unmount if never typed', async () => {
    const { unmount } = renderHook(() =>
      useTypingIndicator(mockConversationId)
    );

    await waitFor(() => {
      expect(realtimeService.subscribeToTypingIndicators).toHaveBeenCalled();
    });

    (realtimeService.setTypingStatus as any).mockClear();

    unmount();

    // No spurious broadcast when user never typed
    expect(realtimeService.setTypingStatus).not.toHaveBeenCalled();
  });
});
