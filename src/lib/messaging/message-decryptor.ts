/**
 * Realtime Message Decryptor
 *
 * Owns the in-memory crypto caches and the single-message decrypt pipeline
 * that useConversationRealtime leans on. Pulled out of that hook once the
 * cache + decrypt path grew past 200 lines and swamped the React wiring —
 * the hook now just composes subscribe → decrypt → upsert.
 *
 * All caches are module-level (survive component unmount/remount) and are
 * invalidated by key rotation / re-auth via the onKeysChanged listener below.
 */

import { createLogger } from '@/lib/logger';
import { encryptionService } from '@/lib/messaging/encryption';
import { keyManagementService } from '@/services/messaging/key-service';
import { createClient } from '@/lib/supabase/client';
import { createMessagingClient } from '@/lib/supabase/messaging-client';
import type { DecryptedMessage, Message } from '@/types/messaging';

const logger = createLogger('messaging:decryptor');

// -----------------------------------------------------------------------------
// Module-level caches
// -----------------------------------------------------------------------------

// Shared secrets (the expensive ECDH derivation). Key: `${convId}:${otherId}`.
const sharedSecretCache = new Map<string, CryptoKey>();

// Imported private CryptoKeys, keyed by user ID.
const privateKeyCache = new Map<string, CryptoKey>();

// Conversation participant pairs, keyed by conversation ID.
const conversationCache = new Map<
  string,
  { participant_1_id: string; participant_2_id: string }
>();

// Sender display names, keyed by user ID.
const profileCache = new Map<
  string,
  { username: string | null; display_name: string | null }
>();

// Invalidate crypto caches whenever the active key pair changes (sign-out,
// re-auth, key rotation, restore-from-storage). Without this, a stale private
// key derives a wrong shared secret → every message after re-authenticating
// renders as "Encrypted with previous keys".
// Module-level (not inside a hook) because the caches themselves are
// module-level — they must clear even if no conversation is mounted.
keyManagementService.onKeysChanged(() => {
  sharedSecretCache.clear();
  privateKeyCache.clear();
  // Conversation + profile caches are data, not crypto — keep them.
});

/** Test-only escape hatch to flush all caches between test cases. */
export function __clearDecryptorCaches(): void {
  sharedSecretCache.clear();
  privateKeyCache.clear();
  conversationCache.clear();
  profileCache.clear();
}

// -----------------------------------------------------------------------------
// Decrypt pipeline
// -----------------------------------------------------------------------------

/**
 * Build a placeholder that preserves message metadata (id, seq, timestamps)
 * so ordering and dedup still work even when decryption fails.
 */
function buildPlaceholder(msg: Message, isOwn: boolean): DecryptedMessage {
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
    isOwn,
    senderName: 'Unknown',
    decryptionError: true,
  };
}

/**
 * Decrypt a single realtime-delivered message.
 *
 * Caches: conversation participants, private key, shared secret, sender
 * profiles. The shared-secret cache hit is the big win — subsequent
 * decrypts for the same conversation skip the ECDH derivation entirely
 * (~50× faster for batches).
 *
 * Never returns null. On any failure (no auth, missing keys, decrypt
 * throw) it returns a placeholder with `decryptionError: true` so the
 * message appears in the thread with a "could not decrypt" badge instead
 * of silently vanishing.
 */
export async function decryptRealtimeMessage(
  msg: Message,
  conversationId: string
): Promise<DecryptedMessage> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn('Cannot decrypt message: not authenticated', {
        messageId: msg.id,
      });
      return buildPlaceholder(msg, false);
    }

    const isOwn = msg.sender_id === user.id;

    // Conversation participants (cached).
    let conversation = conversationCache.get(conversationId);
    if (!conversation) {
      const msgClient = createMessagingClient(supabase);
      const result = await msgClient
        .from('conversations')
        .select('participant_1_id, participant_2_id')
        .eq('id', conversationId)
        .single();

      const fetched = result.data as {
        participant_1_id: string;
        participant_2_id: string;
      } | null;

      if (!fetched) {
        logger.warn('Cannot decrypt message: conversation not found', {
          messageId: msg.id,
          conversationId,
        });
        return buildPlaceholder(msg, isOwn);
      }
      conversation = fetched;
      conversationCache.set(conversationId, conversation);
    }

    const otherParticipantId =
      conversation.participant_1_id === user.id
        ? conversation.participant_2_id
        : conversation.participant_1_id;

    // Shared secret (cached — the expensive part).
    const cacheKey = `${conversationId}:${otherParticipantId}`;
    let sharedSecret = sharedSecretCache.get(cacheKey);

    if (!sharedSecret) {
      // Private key from memory. ensureKeys() restores from localStorage if
      // this decrypt fires before the page-mount restoreKeysFromSession()
      // effect resolves, so we don't render a placeholder on a timing race.
      let privateKey = privateKeyCache.get(user.id);
      if (!privateKey) {
        const derivedKeys = await keyManagementService.ensureKeys(user.id);
        if (!derivedKeys) {
          // Not in memory, not in storage — user needs to re-authenticate
          // (password-derived keys require the password).
          logger.warn('Cannot decrypt message: encryption keys not available', {
            messageId: msg.id,
          });
          return buildPlaceholder(msg, isOwn);
        }
        privateKey = derivedKeys.privateKey;
        privateKeyCache.set(user.id, privateKey);
      }

      const otherPublicKey =
        await keyManagementService.getUserPublicKey(otherParticipantId);
      if (!otherPublicKey) {
        logger.warn(
          'Cannot decrypt message: other participant has no public key',
          { messageId: msg.id, otherParticipantId }
        );
        return buildPlaceholder(msg, isOwn);
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
      logger.debug('Cached shared secret for conversation', { conversationId });
    }

    // Fast path now that we have the secret.
    const content = await encryptionService.decryptMessage(
      msg.encrypted_content,
      msg.initialization_vector,
      sharedSecret
    );

    // Sender profile (cached).
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
      isOwn,
      senderName:
        senderProfile?.display_name || senderProfile?.username || 'Unknown',
    };
  } catch (err) {
    logger.error('Failed to decrypt message', { messageId: msg.id, error: err });
    return buildPlaceholder(msg, false);
  }
}

// -----------------------------------------------------------------------------
// List merge
// -----------------------------------------------------------------------------

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
