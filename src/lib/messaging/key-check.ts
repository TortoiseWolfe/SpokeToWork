/**
 * Decide what /messages should do about encryption keys on mount.
 *
 * Ordering matters and is the whole point of this module:
 *  1. Find the user id from the locally stored session (no network), so the
 *     localStorage key cache (`stw_keys_<uid>`) can be read offline.
 *  2. Restore from that cache BEFORE asking the database, so a failing DB
 *     query cannot cause a false redirect to /messages/setup (Argon2id, which
 *     crashes Firefox on CI and cannot load offline anyway).
 *  3. Only then ask hasKeys(), and treat "unreachable" as its own outcome.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { KeysUnreachableError } from '@/types/messaging';

export type KeyCheckResult =
  | 'restored' // keys are in memory, show the thread
  | 'needs-reauth' // keys exist server-side, user must unlock with password
  | 'no-keys' // definitely none: go to setup
  | 'unreachable'; // cannot tell (offline): never go to setup

interface KeyServiceLike {
  restoreKeysFromSession(userId?: string): Promise<boolean>;
  hasKeys(): Promise<boolean>;
}

/** User id without a network round trip when a session is stored locally. */
async function resolveUserId(
  supabase: Pick<SupabaseClient, 'auth'>
): Promise<string | undefined> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch {
    // fall through to the network lookup
  }
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id;
  } catch {
    return undefined;
  }
}

export async function checkMessagingKeys(
  supabase: Pick<SupabaseClient, 'auth'>,
  keyService: KeyServiceLike
): Promise<KeyCheckResult> {
  const userId = await resolveUserId(supabase);

  if (await keyService.restoreKeysFromSession(userId)) {
    return 'restored';
  }

  try {
    return (await keyService.hasKeys()) ? 'needs-reauth' : 'no-keys';
  } catch (error) {
    if (error instanceof KeysUnreachableError) return 'unreachable';
    throw error;
  }
}
