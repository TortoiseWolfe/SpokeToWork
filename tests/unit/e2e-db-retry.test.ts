import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTransientDbError, retryOnDbError } from '../e2e/utils/db-retry';

describe('isTransientDbError', () => {
  it.each([
    'canceling statement due to statement timeout',
    `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
    '{}',
    'fetch failed',
    '503 Service Unavailable',
  ])('treats "%s" as the database failing under load', (message) => {
    expect(isTransientDbError(message)).toBe(true);
  });

  it.each([
    'duplicate key value violates unique constraint',
    'new row violates row-level security policy',
    'expected >=5 companies, got 2',
    '',
  ])('does not retry "%s"', (message) => {
    expect(isTransientDbError(message)).toBe(false);
  });
});

describe('retryOnDbError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries a statement timeout and returns the later success', async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({
        error: { message: 'canceling statement due to statement timeout' },
      })
      .mockResolvedValueOnce({ error: null, data: 'ok' });
    const promise = retryOnDbError('test', call);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ error: null, data: 'ok' });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('returns a real error on the first attempt without retrying', async () => {
    const call = vi.fn().mockResolvedValue({
      error: { message: 'new row violates row-level security policy' },
    });
    await expect(retryOnDbError('test', call)).resolves.toEqual({
      error: { message: 'new row violates row-level security policy' },
    });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('gives up after the attempt limit and returns the last error', async () => {
    const call = vi.fn().mockResolvedValue({ error: { message: '{}' } });
    const promise = retryOnDbError('test', call, 3);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ error: { message: '{}' } });
    expect(call).toHaveBeenCalledTimes(3);
  });
});
