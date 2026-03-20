'use client';

/**
 * useConversationRealtimeSync — realtime subscription lifecycle for a conversation.
 *
 * Extracted from useConversationRealtime to keep each hook focused.
 * Owns: channel subscribe / unsubscribe, reconnection catch-up, dedup, ordering.
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
 * Handles dedup, ordering, and reconnection catch-up.
 */
export function useConversationRealtimeSync({
  conversationId,
  supabase,
  conversationDataRef,
  loadMessages,
  setMessages,
}: UseConversationRealtimeSyncOptions): void {
  const isMountedRef = useRef(true);

  const decryptSingle = useCallback(
    async (msg: Message): Promise<DecryptedMessage | null> =>
      decryptMessage(msg, conversationId, supabase, conversationDataRef),
    [conversationId, supabase, conversationDataRef]
  );

  useEffect(() => {
    isMountedRef.current = true;

    // Load initial messages
    loadMessages();

    // Subscribe to new messages (with reconnection catch-up)
    const unsubscribeMessages = realtimeService.subscribeToMessages(
      conversationId,
      async (message) => {
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
      }
    );

    // Subscribe to message updates (edits/deletes)
    const unsubscribeUpdates = realtimeService.subscribeToMessageUpdates(
      conversationId,
      async (newMessage) => {
        const decrypted = await decryptSingle(newMessage);
        if (decrypted && isMountedRef.current) {
          setMessages((prev) => upsertMessage(prev, decrypted));
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      unsubscribeMessages();
      unsubscribeUpdates();
      realtimeService.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId, loadMessages, decryptSingle, setMessages]);
}
