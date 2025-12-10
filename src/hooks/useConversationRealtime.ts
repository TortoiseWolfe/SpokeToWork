'use client';

/**
 * useConversationRealtime Hook
 * Task: T112
 *
 * Manages real-time message subscriptions and state for a conversation.
 * Subscribes to new messages, message updates, and handles pagination.
 *
 * Features:
 * - Real-time message delivery (<500ms)
 * - Automatic decryption of new messages
 * - Message update handling (edits/deletes)
 * - Pagination support
 * - Automatic cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@/lib/logger';
import { realtimeService } from '@/lib/messaging/realtime';
import { messageService } from '@/services/messaging/message-service';
import { encryptionService } from '@/lib/messaging/encryption';
import { keyManagementService } from '@/services/messaging/key-service';
import type {
  DecryptedMessage,
  Message,
  UseConversationRealtimeReturn,
} from '@/types/messaging';
import { createClient } from '@/lib/supabase/client';
import { createMessagingClient } from '@/lib/supabase/messaging-client';

const logger = createLogger('hooks:conversationRealtime');

// Module-level cache for shared secrets (cleared on page unload)
// Key: `${conversationId}:${otherParticipantId}`, Value: CryptoKey
const sharedSecretCache = new Map<string, CryptoKey>();

// Cache for imported private keys (per user)
const privateKeyCache = new Map<string, CryptoKey>();

// Cache for user profiles (sender info)
const profileCache = new Map<
  string,
  { username: string | null; display_name: string | null }
>();

export function useConversationRealtime(
  conversationId: string
): UseConversationRealtimeReturn {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const supabase = createClient();

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Use ref to prevent race condition in loadMore
  const loadingRef = useRef(false);

  // Cache conversation data (other participant ID)
  const conversationDataRef = useRef<{
    participant_1_id: string;
    participant_2_id: string;
  } | null>(null);

  /**
   * Decrypt a single message (with caching for performance)
   *
   * Caches: conversation data, private key, shared secret, sender profiles
   * Performance improvement: ~50x faster for batch decryption
   */
  const decryptSingleMessage = useCallback(
    async (msg: Message): Promise<DecryptedMessage | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return null;

        // Get conversation details (cached in ref)
        let conversation = conversationDataRef.current;
        if (!conversation) {
          const msgClient = createMessagingClient(supabase);
          const result = await msgClient
            .from('conversations')
            .select('participant_1_id, participant_2_id')
            .eq('id', conversationId)
            .single();

          conversation = result.data as {
            participant_1_id: string;
            participant_2_id: string;
          } | null;

          if (!conversation) return null;
          conversationDataRef.current = conversation;
        }

        // Determine other participant
        const otherParticipantId =
          conversation.participant_1_id === user.id
            ? conversation.participant_2_id
            : conversation.participant_1_id;

        // Check shared secret cache first (most expensive operation)
        const cacheKey = `${conversationId}:${otherParticipantId}`;
        let sharedSecret = sharedSecretCache.get(cacheKey);

        if (!sharedSecret) {
          // Get private key (cached)
          let privateKey = privateKeyCache.get(user.id);
          if (!privateKey) {
            const privateKeyJwk = await encryptionService.getPrivateKey(
              user.id
            );
            if (!privateKeyJwk) return null;

            privateKey = await crypto.subtle.importKey(
              'jwk',
              privateKeyJwk,
              { name: 'ECDH', namedCurve: 'P-256' },
              false,
              ['deriveBits', 'deriveKey']
            );
            privateKeyCache.set(user.id, privateKey);
          }

          // Get other participant's public key
          const otherPublicKey =
            await keyManagementService.getUserPublicKey(otherParticipantId);
          if (!otherPublicKey) return null;

          const otherPublicKeyCrypto = await crypto.subtle.importKey(
            'jwk',
            otherPublicKey,
            { name: 'ECDH', namedCurve: 'P-256' },
            false,
            []
          );

          // Derive shared secret and cache it
          sharedSecret = await encryptionService.deriveSharedSecret(
            privateKey,
            otherPublicKeyCrypto
          );
          sharedSecretCache.set(cacheKey, sharedSecret);
          logger.debug('Cached shared secret for conversation', {
            conversationId,
          });
        }

        // Decrypt message (fast operation once we have shared secret)
        const content = await encryptionService.decryptMessage(
          msg.encrypted_content,
          msg.initialization_vector,
          sharedSecret
        );

        // Get sender profile (cached)
        let senderProfile = profileCache.get(msg.sender_id);
        if (!senderProfile) {
          const { data } = await supabase
            .from('user_profiles')
            .select('username, display_name')
            .eq('id', msg.sender_id)
            .single();

          senderProfile = data || { username: null, display_name: null };
          profileCache.set(msg.sender_id, senderProfile);
        }

        return {
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content,
          sequence_number: msg.sequence_number,
          deleted: msg.deleted,
          edited: msg.edited,
          edited_at: msg.edited_at,
          delivered_at: msg.delivered_at,
          read_at: msg.read_at,
          created_at: msg.created_at,
          isOwn: msg.sender_id === user.id,
          senderName:
            senderProfile?.display_name || senderProfile?.username || 'Unknown',
        };
      } catch (err) {
        logger.error('Failed to decrypt message', { error: err });
        return null;
      }
    },
    [conversationId, supabase]
  );

  /**
   * Load initial messages
   */
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

  /**
   * Load more messages (pagination)
   */
  const loadMore = useCallback(async () => {
    // Check both state and ref to prevent race condition
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
        // Prepend older messages
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

  /**
   * Send a new message
   */
  const sendMessage = useCallback(
    async (content: string) => {
      try {
        await messageService.sendMessage({
          conversation_id: conversationId,
          content,
        });
        // Message will be added via real-time subscription
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [conversationId]
  );

  /**
   * Edit a message within 15-minute window
   * Task: T105 (integration)
   */
  const editMessage = useCallback(
    async (message_id: string, new_content: string) => {
      try {
        await messageService.editMessage({
          message_id,
          new_content,
        });
        // Message will be updated via real-time subscription
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  /**
   * Delete a message within 15-minute window
   * Task: T106 (integration)
   */
  const deleteMessage = useCallback(async (message_id: string) => {
    try {
      await messageService.deleteMessage(message_id);
      // Message will be updated via real-time subscription
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  /**
   * Subscribe to real-time messages and updates
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Load initial messages
    loadMessages();

    // Subscribe to new messages
    const unsubscribeMessages = realtimeService.subscribeToMessages(
      conversationId,
      async (message) => {
        const decrypted = await decryptSingleMessage(message);
        if (decrypted && isMountedRef.current) {
          setMessages((prev) => [...prev, decrypted]);
        }
      }
    );

    // Subscribe to message updates (edits/deletes)
    const unsubscribeUpdates = realtimeService.subscribeToMessageUpdates(
      conversationId,
      async (newMessage, oldMessage) => {
        const decrypted = await decryptSingleMessage(newMessage);
        if (decrypted && isMountedRef.current) {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === decrypted.id ? decrypted : msg))
          );
        }
      }
    );

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      unsubscribeMessages();
      unsubscribeUpdates();
      realtimeService.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId, loadMessages, decryptSingleMessage]);

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
