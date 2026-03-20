/**
 * decrypt-message — stateless (cache-aware) single-message decryption.
 *
 * Extracted from useConversationRealtime so the hook stays under 400 lines.
 * Caches: conversation participants, private key, shared secret, sender profile.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import { encryptionService } from '@/lib/messaging/encryption';
import { keyManagementService } from '@/services/messaging/key-service';
import { createMessagingClient } from '@/lib/supabase/messaging-client';
import type { Message, DecryptedMessage } from '@/types/messaging';
import {
  sharedSecretCache,
  privateKeyCache,
  profileCache,
} from '@/lib/messaging/decryption-cache';

const logger = createLogger('messaging:decrypt-message');

/** Ref-like mutable holder so the caller can share conversation data across calls. */
export interface ConversationDataRef {
  current: { participant_1_id: string; participant_2_id: string } | null;
}

/** Build a placeholder DecryptedMessage when decryption is impossible. */
function makePlaceholder(
  msg: Message,
  userId: string,
  reason: string
): DecryptedMessage {
  return {
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    content: reason,
    sequence_number: msg.sequence_number,
    deleted: msg.deleted,
    edited: msg.edited,
    edited_at: msg.edited_at,
    delivered_at: msg.delivered_at,
    read_at: msg.read_at,
    created_at: msg.created_at,
    isOwn: msg.sender_id === userId,
    senderName: 'Unknown',
    decryptionError: true,
  };
}

/**
 * Decrypt a single Message → DecryptedMessage, using module-level caches
 * for shared secret, private key, and sender profile.
 */
export async function decryptMessage(
  msg: Message,
  conversationId: string,
  supabase: SupabaseClient,
  conversationDataRef: ConversationDataRef
): Promise<DecryptedMessage | null> {
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;
    userId = user.id;

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
      // Get private key from memory (derived during sign-in)
      let privateKey = privateKeyCache.get(user.id);
      if (!privateKey) {
        const derivedKeys = await keyManagementService.ensureKeys(user.id);
        if (!derivedKeys) {
          logger.warn(
            'No derived keys available - user may need to re-authenticate'
          );
          return makePlaceholder(
            msg,
            user.id,
            'Unable to decrypt — please sign in again'
          );
        }

        privateKey = derivedKeys.privateKey;
        privateKeyCache.set(user.id, privateKey);
      }

      // Get other participant's public key
      const otherPublicKey =
        await keyManagementService.getUserPublicKey(otherParticipantId);
      if (!otherPublicKey) {
        logger.warn('Other participant has no public key', {
          otherParticipantId,
        });
        return makePlaceholder(
          msg,
          user.id,
          'Unable to decrypt — sender encryption keys unavailable'
        );
      }

      const otherPublicKeyCrypto = await crypto.subtle.importKey(
        'jwk',
        otherPublicKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      sharedSecret = await encryptionService.deriveSharedSecret(
        privateKey,
        otherPublicKeyCrypto
      );
      sharedSecretCache.set(cacheKey, sharedSecret);
      logger.debug('Cached shared secret for conversation', {
        conversationId,
      });
    }

    // Decrypt message (fast once we have shared secret)
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
    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: 'Encrypted with previous keys',
      sequence_number: msg.sequence_number,
      deleted: msg.deleted,
      edited: msg.edited,
      edited_at: msg.edited_at,
      delivered_at: msg.delivered_at,
      read_at: msg.read_at,
      created_at: msg.created_at,
      isOwn: userId !== null && msg.sender_id === userId,
      senderName: 'Unknown',
      decryptionError: true,
    };
  }
}

/**
 * Upsert a decrypted message into the list: replace if the ID already
 * exists, otherwise insert; then sort by sequence_number (falling back to
 * created_at for seq=0 offline-queued placeholders).
 *
 * Idempotent by design — Realtime can redeliver on reconnect and we must
 * not duplicate. Also refuses to regress a plaintext message back to an
 * error placeholder if a later redelivery fails to decrypt.
 */
export function upsertMessage(
  prev: DecryptedMessage[],
  incoming: DecryptedMessage
): DecryptedMessage[] {
  const idx = prev.findIndex((m) => m.id === incoming.id);
  let next: DecryptedMessage[];

  if (idx >= 0) {
    const existing = prev[idx];
    // Don't downgrade plaintext → "could not decrypt" placeholder.
    const merged =
      incoming.decryptionError && !existing.decryptionError
        ? {
            ...incoming,
            content: existing.content,
            isOwn: existing.isOwn,
            senderName: existing.senderName,
            decryptionError: false,
          }
        : incoming;
    next = [...prev];
    next[idx] = merged;
  } else {
    next = [...prev, incoming];
  }

  return next.sort((a, b) => {
    if (a.sequence_number !== b.sequence_number) {
      return a.sequence_number - b.sequence_number;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
