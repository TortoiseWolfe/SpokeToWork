'use client';

/**
 * useTypingIndicator Hook
 * Task: T113
 *
 * Manages typing indicator state for a conversation.
 * Subscribes to other user's typing status and sends own typing status.
 *
 * Features:
 * - Subscribe to typing indicators via Supabase Realtime
 * - Debounced typing status updates (1s delay)
 * - Automatic expiration after 5s of inactivity
 * - Filters out own typing status (only shows other user)
 *
 * @param conversationId - UUID of the conversation
 * @returns { isTyping, setTyping } - Other user's typing status and function to set own status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { realtimeService } from '@/lib/messaging/realtime';
import { createClient } from '@/lib/supabase/client';
import type { UseTypingIndicatorReturn } from '@/types/messaging';

export function useTypingIndicator(
  conversationId: string
): UseTypingIndicatorReturn {
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether the local user has broadcast is_typing=true without a
  // matching is_typing=false yet. If the hook unmounts (tab close, route
  // change, conversation switch) while this is true, cleanup must send the
  // final stop-typing broadcast so the peer isn't left with a stuck indicator.
  const localTypingRef = useRef(false);
  const supabase = createClient();

  /**
   * Get current user ID
   */
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    getCurrentUser();
  }, [supabase]);

  /**
   * Set own typing status
   */
  const setTyping = useCallback(
    (typing: boolean) => {
      localTypingRef.current = typing;
      realtimeService.setTypingStatus(conversationId, typing);
    },
    [conversationId]
  );

  /**
   * Subscribe to typing indicators
   */
  useEffect(() => {
    if (!currentUserId) return;

    const handleTypingEvent = (userId: string, typing: boolean) => {
      // Ignore own typing status
      if (userId === currentUserId) return;

      // Update other user's typing status
      setIsTyping(typing);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Auto-expire typing indicator after 5 seconds
      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          typingTimeoutRef.current = null;
        }, 5000);
      }
    };

    const unsubscribe = realtimeService.subscribeToTypingIndicators(
      conversationId,
      handleTypingEvent,
      () => {
        // Signal subscription readiness via DOM attribute (used by E2E tests)
        if (typeof document !== 'undefined' && conversationId) {
          document.body.setAttribute('data-typing-subscribed', conversationId);
        }
      }
    );

    // Expose test seam for E2E (simulates typing events without Realtime delivery)
    // Uses flushSync to force immediate React re-render — without this,
    // state updates from page.evaluate() are batched/deferred and the
    // TypingIndicator never becomes visible before the test assertion.
    if (typeof window !== 'undefined') {
      (window as any).__e2eSimulateTyping = (
        userId: string,
        typing: boolean
      ) => {
        flushSync(() => {
          handleTypingEvent(userId, typing);
        });
      };
    }

    // Cleanup on unmount or conversation switch
    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        delete (window as any).__e2eSimulateTyping;
      }
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-typing-subscribed');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Reset the peer's-typing flag. If conversationId changed while the
      // indicator was active, the cleared timeout above means the 5s
      // auto-expire will never fire, so without this reset isTyping stays
      // true forever on the new conversation.
      setIsTyping(false);
      // If the local user was mid-type when this effect tore down (tab close,
      // nav away, conversation switch), send the final stop-typing broadcast
      // so the peer isn't stuck. The peer's 5s auto-expire is not reliable
      // here: if Realtime disconnects concurrently, the last `true` may have
      // been delivered but the expire timer runs in the peer's tab only after
      // the NEXT event, which will never arrive.
      if (localTypingRef.current) {
        localTypingRef.current = false;
        realtimeService.setTypingStatus(conversationId, false);
      }
    };
  }, [conversationId, currentUserId]);

  return {
    isTyping,
    setTyping,
  };
}
