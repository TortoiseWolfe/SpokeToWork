/**
 * Module-level decryption caches for the messaging system.
 *
 * Extracted into a standalone module to avoid circular imports between
 * key-service (which must clear caches on sign-out / key rotation) and
 * useConversationRealtime (which populates and reads the caches).
 */

// Shared secret cache: Key = `${conversationId}:${otherParticipantId}`
export const sharedSecretCache = new Map<string, CryptoKey>();

// Imported private key cache: Key = userId
export const privateKeyCache = new Map<string, CryptoKey>();

// User profile cache: Key = senderId
export const profileCache = new Map<
  string,
  { username: string | null; display_name: string | null }
>();

/**
 * Clear all module-level decryption caches.
 * Must be called on sign-out and key rotation so stale shared secrets
 * derived from old key pairs are never reused.
 */
export function clearDecryptionCaches(): void {
  sharedSecretCache.clear();
  privateKeyCache.clear();
  profileCache.clear();
}
