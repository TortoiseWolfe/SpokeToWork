'use client';

/**
 * useConversationRealtime Hook
 * Task: T112
 *
 * Manages real-time message subscriptions and state for a conversation.
 * Delegates decryption to decrypt-message and channel lifecycle to
 * useConversationRealtimeSync.
 */

import { useState, useCallback, useRef } from 'react';
import { messageService } from '@/services/messaging/message-service';
import type {
  DecryptedMessage,
  UseConversationRealtimeReturn,
} from '@/types/messaging';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/lib/messaging/decryption-cache';
import {
  decryptMessage,
  type ConversationDataRef,
} from '@/lib/messaging/decrypt-message';
import { useConversationRealtimeSync } from './useConversationRealtimeSync';

export function useConversationRealtime(
  conversationId: string
): UseConversationRealtimeReturn {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const supabase = createClient();

  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);
  const conversationDataRef = useRef<ConversationDataRef['current']>(null);

  // --- Data loading ----------------------------------------------------------

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const result = await messageService.getMessageHistory(conversationId);

      if (isMountedRef.current) {
        setMessages(result.messages);
        setHasMore(result.has_more);
        setCursor(result.cursor);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingRef.current) return;

    loadingRef.current = true;
    try {
      setLoading(true);
      const result = await messageService.getMessageHistory(
        conversationId,
        cursor,
        50
      );

      if (isMountedRef.current) {
        setMessages((prev) => [...result.messages, ...prev]);
        setHasMore(result.has_more);
        setCursor(result.cursor);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [conversationId, cursor, hasMore, loading]);

  // --- Realtime subscription (extracted hook) --------------------------------

  useConversationRealtimeSync({
    conversationId,
    supabase,
    conversationDataRef,
    loadMessages,
    setMessages,
  });

  // --- Mutations -------------------------------------------------------------

  /**
   * Send a new message with optimistic update.
   * Bug fix: adds message to state immediately instead of waiting for
   * realtime subscription (which may not be ready for the first message).
   */
  const sendMessage = useCallback(
    async (content: string) => {
      try {
        const result = await messageService.sendMessage({
          conversation_id: conversationId,
          content,
        });

        if (result.message && isMountedRef.current) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          const senderProfile = user ? getProfile(user.id) : null;

          const optimisticMsg: DecryptedMessage = {
            id: result.message.id,
            conversation_id: conversationId,
            sender_id: result.message.sender_id,
            content,
            sequence_number: result.message.sequence_number,
            deleted: false,
            edited: false,
            edited_at: null,
            delivered_at: result.message.delivered_at,
            read_at: null,
            created_at: result.message.created_at,
            isOwn: true,
            senderName:
              senderProfile?.display_name || senderProfile?.username || 'You',
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === optimisticMsg.id)) return prev;
            return [...prev, optimisticMsg].sort(
              (a, b) => a.sequence_number - b.sequence_number
            );
          });
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [conversationId, supabase]
  );

  /**
   * Edit a message within 15-minute window (T105)
   */
  const editMessage = useCallback(
    async (message_id: string, new_content: string) => {
      try {
        await messageService.editMessage({ message_id, new_content });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message_id
              ? {
                  ...msg,
                  content: new_content,
                  edited: true,
                  edited_at: new Date().toISOString(),
                }
              : msg
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  /**
   * Delete a message within 15-minute window (T106)
   */
  const deleteMessage = useCallback(async (message_id: string) => {
    try {
      await messageService.deleteMessage(message_id);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMore,
    hasMore,
  };
}
