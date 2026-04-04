/**
 * Per-shard test user credentials.
 *
 * Each of the 6 Playwright shards gets its own test users to eliminate
 * cross-shard data conflicts (encryption keys, conversations, connections).
 * Shard index is set by E2E_SHARD_INDEX env var in the CI workflow.
 *
 * User format: e2e-s{shard}-{role}@mailinator.com
 * Password: shared across all shards (from TEST_USER_PRIMARY_PASSWORD env var)
 */

export interface ShardUser {
  email: string;
  password: string;
}

export interface ShardUsers {
  primary: ShardUser;
  secondary: ShardUser;
  tertiary: ShardUser;
  shardIndex: string;
}

/**
 * Get the current shard index (1-6). Falls back to '1' for local dev.
 */
export function getShardIndex(): string {
  return process.env.E2E_SHARD_INDEX || '1';
}

/**
 * Get shard-specific test user credentials.
 *
 * In CI, each shard gets unique users (e2e-s1-primary, e2e-s2-primary, etc).
 * Locally, falls back to the standard TEST_USER_*_EMAIL env vars.
 */
export function getShardUsers(): ShardUsers {
  const shard = getShardIndex();
  const password = process.env.TEST_USER_PRIMARY_PASSWORD!;

  // In CI (E2E_SHARD_INDEX is set), use per-shard users
  if (process.env.E2E_SHARD_INDEX) {
    return {
      primary: {
        email: `e2e-s${shard}-primary@mailinator.com`,
        password,
      },
      secondary: {
        email: `e2e-s${shard}-secondary@mailinator.com`,
        password,
      },
      tertiary: {
        email: `e2e-s${shard}-tertiary@mailinator.com`,
        password,
      },
      shardIndex: shard,
    };
  }

  // Local dev: use standard env vars
  return {
    primary: {
      email: process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com',
      password,
    },
    secondary: {
      email:
        process.env.TEST_USER_SECONDARY_EMAIL || 'test-secondary@example.com',
      password: process.env.TEST_USER_SECONDARY_PASSWORD || password,
    },
    tertiary: {
      email:
        process.env.TEST_USER_TERTIARY_EMAIL || 'test-tertiary@example.com',
      password: process.env.TEST_USER_TERTIARY_PASSWORD || password,
    },
    shardIndex: shard,
  };
}

/**
 * Get all shard user emails (for global-setup user creation).
 * Returns emails for all 6 shards × 3 roles = 18 users.
 */
export function getAllShardEmails(): string[] {
  const emails: string[] = [];
  for (let shard = 1; shard <= 6; shard++) {
    emails.push(
      `e2e-s${shard}-primary@mailinator.com`,
      `e2e-s${shard}-secondary@mailinator.com`,
      `e2e-s${shard}-tertiary@mailinator.com`
    );
  }
  return emails;
}
