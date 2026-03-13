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
  const supabase = createClient();

  // Debug: sync isTyping state to DOM for E2E diagnostics
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-typing-state', String(isTyping));
    }
  }, [isTyping]);

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
      // Debug: record handler invocation for E2E diagnostics
      if (typeof document !== 'undefined') {
        document.body.setAttribute(
          'data-typing-handler-called',
          JSON.stringify({ userId, typing, currentUserId, ts: Date.now() })
        );
      }

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

    // Cleanup on unmount
    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        delete (window as any).__e2eSimulateTyping;
      }
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-typing-subscribed');
        document.body.removeAttribute('data-typing-handler-called');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId]);

  return {
    isTyping,
    setTyping,
  };
}
