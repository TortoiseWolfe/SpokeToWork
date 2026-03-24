'use client';

/**
 * useConversationRealtimeSync — realtime subscription lifecycle for a conversation.
 *
 * Extracted from useConversationRealtime to keep each hook focused.
 * Owns: channel subscribe / unsubscribe, reconnection catch-up, dedup, ordering.
 *
 * Includes a 10-second polling fallback that catches messages silently dropped
 * by Supabase Realtime under connection contention (e.g. free-tier limits).
 */

import { useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import { realtimeService } from '@/lib/messaging/realtime';
import type { Message, DecryptedMessage } from '@/types/messaging';
import {
  decryptMessage,
  upsertMessage,
  type ConversationDataRef,
} from '@/lib/messaging/decrypt-message';

const logger = createLogger('hooks:conversationRealtimeSync');

/** How often the polling fallback fires (ms). */
const POLL_INTERVAL_MS = 10_000;

export interface UseConversationRealtimeSyncOptions {
  conversationId: string;
  supabase: SupabaseClient;
  conversationDataRef: ConversationDataRef;
  /** Called once on mount + on reconnection to load/reload history. */
  loadMessages: () => Promise<void>;
  /** Setter to merge new/updated messages into state. */
  setMessages: React.Dispatch<React.SetStateAction<DecryptedMessage[]>>;
}

/**
 * Subscribe to INSERT and UPDATE events on messages for a conversation.
 * Handles dedup, ordering, reconnection catch-up, and periodic polling fallback.
 */
export function useConversationRealtimeSync({
  conversationId,
  supabase,
  conversationDataRef,
  loadMessages,
  setMessages,
}: UseConversationRealtimeSyncOptions): void {
  const isMountedRef = useRef(true);
  const lastRealtimeEventRef = useRef(0);

  const decryptSingle = useCallback(
    async (msg: Message): Promise<DecryptedMessage | null> =>
      decryptMessage(msg, conversationId, supabase, conversationDataRef),
    [conversationId, supabase, conversationDataRef]
  );

  // Mark that Realtime delivered something — resets the polling skip window
  const touchRealtime = useCallback(() => {
    lastRealtimeEventRef.current = Date.now();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Load initial messages
    loadMessages();

    // Subscribe to new messages (with reconnection catch-up)
    const unsubscribeMessages = realtimeService.subscribeToMessages(
      conversationId,
      async (message) => {
        touchRealtime();
        const decrypted = await decryptSingle(message);
        if (decrypted && isMountedRef.current) {
          setMessages((prev) => upsertMessage(prev, decrypted));
        }
      },
      () => {
        if (isMountedRef.current) {
          logger.debug('Reconnected — refetching messages to catch up');
          loadMessages();
        }
      },
      () => {
        // Signal message subscription readiness via DOM attribute (used by E2E tests)
        if (typeof document !== 'undefined' && conversationId) {
          document.body.setAttribute(
            'data-messages-subscribed',
            conversationId
          );
        }
      }
    );

    // Subscribe to message updates (edits/deletes)
    const unsubscribeUpdates = realtimeService.subscribeToMessageUpdates(
      conversationId,
      async (newMessage) => {
        touchRealtime();
        const decrypted = await decryptSingle(newMessage);
        if (decrypted && isMountedRef.current) {
          setMessages((prev) => upsertMessage(prev, decrypted));
        }
      }
    );

    // ── Polling fallback ──────────────────────────────────────────────
    // Supabase Realtime on the free tier can silently drop messages under
    // connection contention.  This interval re-fetches from the DB every
    // POLL_INTERVAL_MS when Realtime hasn't delivered anything recently,
    // guaranteeing eventual delivery even if the WebSocket missed an event.
    const pollTimer = setInterval(() => {
      if (!isMountedRef.current) return;
      // Skip if tab is hidden (save API calls)
      if (typeof document !== 'undefined' && document.hidden) return;
      // Skip if Realtime delivered something within the last interval
      if (Date.now() - lastRealtimeEventRef.current < POLL_INTERVAL_MS) return;

      logger.debug('Polling fallback — refetching messages');
      loadMessages().then(() => {
        if (typeof document !== 'undefined') {
          document.body.setAttribute(
            'data-messages-last-poll',
            new Date().toISOString()
          );
        }
      });
    }, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      unsubscribeMessages();
      unsubscribeUpdates();
      clearInterval(pollTimer);
      realtimeService.unsubscribeFromConversation(conversationId);
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-messages-subscribed');
        document.body.removeAttribute('data-messages-last-poll');
      }
    };
  }, [conversationId, loadMessages, decryptSingle, setMessages, touchRealtime]);
}
