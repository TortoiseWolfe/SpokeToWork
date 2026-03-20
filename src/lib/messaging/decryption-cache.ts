/**
 * Module-level decryption caches for the messaging system.
 *
 * Extracted into a standalone module to avoid circular imports between
 * key-service (which must clear caches on sign-out / key rotation) and
 * useConversationRealtime (which populates and reads the caches).
 */

/** How long a cached profile stays valid before re-fetching (10 minutes). */
const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000;

export interface ProfileData {
  username: string | null;
  display_name: string | null;
}

interface CachedProfile {
  data: ProfileData;
  cachedAt: number;
}

// Shared secret cache: Key = `${conversationId}:${otherParticipantId}`
export const sharedSecretCache = new Map<string, CryptoKey>();

// Imported private key cache: Key = userId
export const privateKeyCache = new Map<string, CryptoKey>();

// User profile cache with TTL: Key = senderId
const profileCache = new Map<string, CachedProfile>();

// Pending request maps for deduplication of concurrent fetches
const pendingProfiles = new Map<string, Promise<ProfileData | undefined>>();
const pendingSecrets = new Map<string, Promise<CryptoKey | null>>();

/** Read a profile from cache, returning undefined if missing or expired. */
export function getProfile(senderId: string): ProfileData | undefined {
  const entry = profileCache.get(senderId);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > PROFILE_CACHE_TTL_MS) {
    profileCache.delete(senderId);
    return undefined;
  }
  return entry.data;
}

/** Write a profile to cache with a timestamp. */
export function setProfile(senderId: string, data: ProfileData): void {
  profileCache.set(senderId, { data, cachedAt: Date.now() });
}

/** Immediately invalidate a single profile entry (e.g. after the current user updates their own name). */
export function invalidateProfile(userId: string): void {
  profileCache.delete(userId);
}

/**
 * Deduplicate concurrent profile fetches for the same sender.
 * The first caller runs the fetcher; subsequent callers await the same Promise.
 */
export function deduplicateProfile(
  senderId: string,
  fetcher: () => Promise<ProfileData | undefined>
): Promise<ProfileData | undefined> {
  const pending = pendingProfiles.get(senderId);
  if (pending) return pending;

  const promise = fetcher().finally(() => pendingProfiles.delete(senderId));
  pendingProfiles.set(senderId, promise);
  return promise;
}

/**
 * Deduplicate concurrent shared-secret derivations for the same conversation+participant.
 * The first caller runs the deriver; subsequent callers await the same Promise.
 */
export function deduplicateSecret(
  cacheKey: string,
  deriver: () => Promise<CryptoKey | null>
): Promise<CryptoKey | null> {
  const pending = pendingSecrets.get(cacheKey);
  if (pending) return pending;

  const promise = deriver().finally(() => pendingSecrets.delete(cacheKey));
  pendingSecrets.set(cacheKey, promise);
  return promise;
}

/**
 * Clear all module-level decryption caches.
 * Must be called on sign-out and key rotation so stale shared secrets
 * derived from old key pairs are never reused.
 */
export function clearDecryptionCaches(): void {
  sharedSecretCache.clear();
  privateKeyCache.clear();
  profileCache.clear();
  pendingProfiles.clear();
  pendingSecrets.clear();
}

/** Exported for testing only. */
export const PROFILE_TTL_MS = PROFILE_CACHE_TTL_MS;
