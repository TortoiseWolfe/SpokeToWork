/**
 * Unit Tests for retry-utils.ts
 * Feature 052 - Test Coverage Expansion
 *
 * Tests exponential backoff retry logic for auth operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleep, retryWithBackoff, retrySupabaseAuth } from '../retry-utils';

// Mock logger to avoid console noise
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('retry-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('sleep()', () => {
    it('should resolve after specified duration', async () => {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should not resolve before duration', async () => {
      let resolved = false;
      sleep(1000).then(() => {
        resolved = true;
      });

      vi.advanceTimersByTime(500);
      expect(resolved).toBe(false);

      vi.advanceTimersByTime(500);
      await Promise.resolve(); // Flush promises
      expect(resolved).toBe(true);
    });
  });

  describe('retryWithBackoff()', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const promise = retryWithBackoff(fn);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed eventually', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      });

      const promise = retryWithBackoff(fn, 3, [100, 200, 400]);

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0);

      // Wait for first retry delay
      await vi.advanceTimersByTimeAsync(100);

      // Second attempt fails
      await vi.advanceTimersByTimeAsync(0);

      // Wait for second retry delay
      await vi.advanceTimersByTimeAsync(200);

      // Third attempt succeeds
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after all retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      // Start the retry operation and immediately attach rejection handler
      const promise = retryWithBackoff(fn, 2, [100, 200]).catch((e) => e);

      // Run all timers to completion
      await vi.runAllTimersAsync();

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain(
        'Auth operation failed after 3 attempts'
      );
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use default retry parameters', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      // Start the retry operation and immediately attach rejection handler
      const promise = retryWithBackoff(fn).catch((e) => e);

      // Run all timers to completion
      await vi.runAllTimersAsync();

      const error = await promise;
      expect(error).toBeInstanceOf(Error);
      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should convert non-Error throws to Error', async () => {
      const fn = vi.fn().mockImplementation(() => {
        throw 'string error';
      });

      const promise = retryWithBackoff(fn, 0);

      await expect(promise).rejects.toThrow('string error');
    });
  });

  describe('retrySupabaseAuth()', () => {
    it('should return success response immediately', async () => {
      const fn = vi.fn().mockResolvedValue({
        data: { session: 'test' },
        error: null,
      });

      const result = await retrySupabaseAuth(fn);

      expect(result.data).toEqual({ session: 'test' });
      expect(result.error).toBeNull();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Invalid credentials'),
      });

      const result = await retrySupabaseAuth(fn);

      expect(result.error?.message).toBe('Invalid credentials');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry unauthorized errors', async () => {
      const fn = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Unauthorized access'),
      });

      const result = await retrySupabaseAuth(fn);

      expect(result.error?.message).toBe('Unauthorized access');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry not found errors', async () => {
      const fn = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('User not found'),
      });

      const result = await retrySupabaseAuth(fn);

      expect(result.error?.message).toBe('User not found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry transient errors', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.resolve({
            data: null,
            error: new Error('Network timeout'),
          });
        }
        return Promise.resolve({
          data: { session: 'test' },
          error: null,
        });
      });

      const promise = retrySupabaseAuth(fn, 2, [100, 200]);

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.data).toEqual({ session: 'test' });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should return error after all retries exhausted', async () => {
      const fn = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Transient error'),
      });

      const promise = retrySupabaseAuth(fn, 1, [100]);

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.error?.message).toBe('Transient error');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle thrown exceptions', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Connection refused');
        }
        return Promise.resolve({
          data: { success: true },
          error: null,
        });
      });

      const promise = retrySupabaseAuth(fn, 2, [100, 200]);

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.data).toEqual({ success: true });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
