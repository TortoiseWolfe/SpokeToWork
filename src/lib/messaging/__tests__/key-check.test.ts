/**
 * Unit tests for checkMessagingKeys: what /messages does about encryption
 * keys on mount, including when the network is gone (#96).
 */

import { describe, it, expect, vi } from 'vitest';
import { checkMessagingKeys } from '../key-check';
import { KeysUnreachableError, ConnectionError } from '@/types/messaging';

const makeSupabase = (overrides: Record<string, unknown> = {}) =>
  ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      ...overrides,
    },
  }) as never;

const makeKeys = (overrides: Record<string, unknown> = {}) => ({
  restoreKeysFromSession: vi.fn().mockResolvedValue(false),
  hasKeys: vi.fn().mockResolvedValue(true),
  ...overrides,
});

describe('checkMessagingKeys', () => {
  it('reads the user id from the local session, not the network', async () => {
    const supabase = makeSupabase();
    const keys = makeKeys({
      restoreKeysFromSession: vi.fn().mockResolvedValue(true),
    });

    await expect(checkMessagingKeys(supabase, keys)).resolves.toBe('restored');

    expect(keys.restoreKeysFromSession).toHaveBeenCalledWith('user-1');
    expect(
      (supabase as { auth: { getUser: unknown } }).auth.getUser
    ).not.toHaveBeenCalled();
    expect(keys.hasKeys).not.toHaveBeenCalled();
  });

  it('restores cached keys offline (getUser would have returned null)', async () => {
    const supabase = makeSupabase({
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: { name: 'x' } }),
    });
    const keys = makeKeys({
      restoreKeysFromSession: vi.fn().mockResolvedValue(true),
    });

    await expect(checkMessagingKeys(supabase, keys)).resolves.toBe('restored');
    expect(keys.restoreKeysFromSession).toHaveBeenCalledWith('user-1');
  });

  it('falls back to getUser when there is no stored session', async () => {
    const supabase = makeSupabase({
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    });
    const keys = makeKeys();

    await checkMessagingKeys(supabase, keys);
    expect(keys.restoreKeysFromSession).toHaveBeenCalledWith('user-1');
  });

  it('survives getSession and getUser both throwing', async () => {
    const supabase = makeSupabase({
      getSession: vi.fn().mockRejectedValue(new Error('storage')),
      getUser: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });
    const keys = makeKeys();

    await expect(checkMessagingKeys(supabase, keys)).resolves.toBe(
      'needs-reauth'
    );
    expect(keys.restoreKeysFromSession).toHaveBeenCalledWith(undefined);
  });

  it('asks the database on a cache miss: keys exist -> needs-reauth', async () => {
    const keys = makeKeys({ hasKeys: vi.fn().mockResolvedValue(true) });
    await expect(checkMessagingKeys(makeSupabase(), keys)).resolves.toBe(
      'needs-reauth'
    );
  });

  it('asks the database on a cache miss: no keys -> no-keys (setup)', async () => {
    const keys = makeKeys({ hasKeys: vi.fn().mockResolvedValue(false) });
    await expect(checkMessagingKeys(makeSupabase(), keys)).resolves.toBe(
      'no-keys'
    );
  });

  it('reports unreachable, never no-keys, when the network is down', async () => {
    const keys = makeKeys({
      hasKeys: vi.fn().mockRejectedValue(new KeysUnreachableError('offline')),
    });
    await expect(checkMessagingKeys(makeSupabase(), keys)).resolves.toBe(
      'unreachable'
    );
  });

  it('rethrows other errors so the page can clear its spinner and log', async () => {
    const keys = makeKeys({
      hasKeys: vi.fn().mockRejectedValue(new ConnectionError('db down')),
    });
    await expect(checkMessagingKeys(makeSupabase(), keys)).rejects.toThrow(
      'db down'
    );
  });
});
