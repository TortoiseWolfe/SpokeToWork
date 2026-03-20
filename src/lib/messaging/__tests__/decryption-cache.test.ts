/**
 * Tests for decryption-cache module
 *
 * Covers:
 * - Profile TTL: cached profiles expire after PROFILE_TTL_MS
 * - Profile invalidation: invalidateProfile() clears a single entry
 * - Request deduplication: concurrent fetches coalesce into one call
 * - clearDecryptionCaches() clears everything including pending maps
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sharedSecretCache,
  privateKeyCache,
  getProfile,
  setProfile,
  invalidateProfile,
  deduplicateProfile,
  deduplicateSecret,
  clearDecryptionCaches,
  PROFILE_TTL_MS,
} from '../decryption-cache';

describe('decryption-cache', () => {
  beforeEach(() => {
    clearDecryptionCaches();
  });

  describe('profile TTL', () => {
    it('returns cached profile within TTL window', () => {
      setProfile('user-1', { username: 'alice', display_name: 'Alice' });
      const result = getProfile('user-1');
      expect(result).toEqual({ username: 'alice', display_name: 'Alice' });
    });

    it('returns undefined for expired profile', () => {
      setProfile('user-1', { username: 'alice', display_name: 'Alice' });

      // Advance time past TTL
      vi.useFakeTimers();
      vi.advanceTimersByTime(PROFILE_TTL_MS + 1);

      const result = getProfile('user-1');
      expect(result).toBeUndefined();

      vi.useRealTimers();
    });

    it('returns undefined for unknown sender', () => {
      expect(getProfile('nonexistent')).toBeUndefined();
    });
  });

  describe('invalidateProfile', () => {
    it('removes a single profile entry immediately', () => {
      setProfile('user-1', { username: 'alice', display_name: 'Alice' });
      setProfile('user-2', { username: 'bob', display_name: 'Bob' });

      invalidateProfile('user-1');

      expect(getProfile('user-1')).toBeUndefined();
      expect(getProfile('user-2')).toEqual({
        username: 'bob',
        display_name: 'Bob',
      });
    });
  });

  describe('deduplicateProfile', () => {
    it('coalesces concurrent calls for the same sender into one fetch', async () => {
      const fetcher = vi
        .fn()
        .mockResolvedValue({ username: 'alice', display_name: 'Alice' });

      // Fire 3 concurrent calls
      const [r1, r2, r3] = await Promise.all([
        deduplicateProfile('user-1', fetcher),
        deduplicateProfile('user-1', fetcher),
        deduplicateProfile('user-1', fetcher),
      ]);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(r1).toEqual({ username: 'alice', display_name: 'Alice' });
      expect(r2).toEqual({ username: 'alice', display_name: 'Alice' });
      expect(r3).toEqual({ username: 'alice', display_name: 'Alice' });
    });

    it('allows a new fetch after the first completes', async () => {
      const fetcher = vi
        .fn()
        .mockResolvedValue({ username: 'alice', display_name: 'Alice' });

      await deduplicateProfile('user-1', fetcher);
      await deduplicateProfile('user-1', fetcher);

      // Two sequential calls = two fetcher invocations (no pending overlap)
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('cleans up pending entry even if fetcher throws', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(deduplicateProfile('user-1', fetcher)).rejects.toThrow(
        'Network error'
      );

      // Pending map should be clean — next call should invoke fetcher again
      const fetcher2 = vi
        .fn()
        .mockResolvedValue({ username: null, display_name: null });
      await deduplicateProfile('user-1', fetcher2);
      expect(fetcher2).toHaveBeenCalledTimes(1);
    });
  });

  describe('deduplicateSecret', () => {
    it('coalesces concurrent derivations for the same cache key', async () => {
      const mockSecret = {} as CryptoKey;
      const deriver = vi.fn().mockResolvedValue(mockSecret);

      const [r1, r2] = await Promise.all([
        deduplicateSecret('conv:user', deriver),
        deduplicateSecret('conv:user', deriver),
      ]);

      expect(deriver).toHaveBeenCalledTimes(1);
      expect(r1).toBe(mockSecret);
      expect(r2).toBe(mockSecret);
    });
  });

  describe('clearDecryptionCaches', () => {
    it('clears all caches', () => {
      sharedSecretCache.set('key', {} as CryptoKey);
      privateKeyCache.set('user', {} as CryptoKey);
      setProfile('user', { username: 'test', display_name: 'Test' });

      clearDecryptionCaches();

      expect(sharedSecretCache.size).toBe(0);
      expect(privateKeyCache.size).toBe(0);
      expect(getProfile('user')).toBeUndefined();
    });
  });
});
