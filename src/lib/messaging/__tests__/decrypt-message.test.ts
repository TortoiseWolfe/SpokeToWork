/**
 * Tests for decrypt-message module
 *
 * Covers:
 * - Successful decryption path
 * - Placeholder when keys are unavailable (makePlaceholder path)
 * - isOwn flag after key rotation (catch block path)
 * - Null return when user is not authenticated
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decryptMessage, type ConversationDataRef } from '../decrypt-message';
import type { Message } from '@/types/messaging';

// --- Mocks -------------------------------------------------------------------

const mockDecryptMessage = vi.fn();
const mockDeriveSharedSecret = vi.fn();

vi.mock('@/lib/messaging/encryption', () => ({
  encryptionService: {
    decryptMessage: (...args: unknown[]) => mockDecryptMessage(...args),
    deriveSharedSecret: (...args: unknown[]) => mockDeriveSharedSecret(...args),
  },
}));

const mockEnsureKeys = vi.fn();
const mockGetUserPublicKey = vi.fn();

vi.mock('@/services/messaging/key-service', () => ({
  keyManagementService: {
    ensureKeys: (...args: unknown[]) => mockEnsureKeys(...args),
    getUserPublicKey: (...args: unknown[]) => mockGetUserPublicKey(...args),
  },
}));

vi.mock('@/lib/supabase/messaging-client', () => ({
  createMessagingClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { participant_1_id: 'user-1', participant_2_id: 'user-2' },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/messaging/decryption-cache', () => ({
  sharedSecretCache: new Map(),
  privateKeyCache: new Map(),
  profileCache: new Map(),
}));

// Import the mock instances so we can clear them between tests
import {
  sharedSecretCache,
  privateKeyCache,
  profileCache,
} from '@/lib/messaging/decryption-cache';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// --- Helpers -----------------------------------------------------------------

const CURRENT_USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

function makeMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: OTHER_USER_ID,
    encrypted_content: 'base64-ciphertext',
    initialization_vector: 'base64-iv',
    sequence_number: 1,
    deleted: false,
    edited: false,
    edited_at: null,
    delivered_at: null,
    read_at: null,
    created_at: '2026-03-19T00:00:00Z',
    key_version: 1,
    is_system_message: false,
    system_message_type: null,
    ...overrides,
  };
}

function makeSupabase(userId: string | null = CURRENT_USER_ID) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { username: 'alice', display_name: 'Alice' },
            error: null,
          }),
        }),
      }),
    }),
  } as any;
}

function makeRef(data?: ConversationDataRef['current']): ConversationDataRef {
  return { current: data ?? null };
}

// --- Tests -------------------------------------------------------------------

describe('decryptMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedSecretCache.clear();
    privateKeyCache.clear();
    profileCache.clear();
  });

  it('returns null when user is not authenticated', async () => {
    const supabase = makeSupabase(null);
    const result = await decryptMessage(
      makeMessage(),
      'conv-1',
      supabase,
      makeRef({ participant_1_id: CURRENT_USER_ID, participant_2_id: OTHER_USER_ID })
    );
    expect(result).toBeNull();
  });

  it('returns placeholder with correct isOwn when keys are unavailable', async () => {
    mockEnsureKeys.mockResolvedValue(null);

    const ownMessage = makeMessage({ sender_id: CURRENT_USER_ID });
    const supabase = makeSupabase();
    const ref = makeRef({ participant_1_id: CURRENT_USER_ID, participant_2_id: OTHER_USER_ID });

    const result = await decryptMessage(ownMessage, 'conv-1', supabase, ref);

    expect(result).not.toBeNull();
    expect(result!.decryptionError).toBe(true);
    expect(result!.isOwn).toBe(true);
    expect(result!.content).toContain('Unable to decrypt');
  });

  it('returns placeholder with isOwn=false for other user when keys unavailable', async () => {
    mockEnsureKeys.mockResolvedValue(null);

    const otherMessage = makeMessage({ sender_id: OTHER_USER_ID });
    const supabase = makeSupabase();
    const ref = makeRef({ participant_1_id: CURRENT_USER_ID, participant_2_id: OTHER_USER_ID });

    const result = await decryptMessage(otherMessage, 'conv-1', supabase, ref);

    expect(result!.decryptionError).toBe(true);
    expect(result!.isOwn).toBe(false);
  });

  // --- Key rotation scenario -------------------------------------------------

  it('preserves isOwn=true in catch block when own message fails decryption (key rotation)', async () => {
    // Simulate: keys are available but decryption fails (old message, new keys)
    const mockPrivateKey = {} as CryptoKey;
    mockEnsureKeys.mockResolvedValue({ privateKey: mockPrivateKey });
    mockGetUserPublicKey.mockResolvedValue({ kty: 'EC', crv: 'P-256' });

    // crypto.subtle.importKey for the other user's public key
    const mockImportedKey = {} as CryptoKey;
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue(mockImportedKey);

    // deriveSharedSecret returns a CryptoKey
    const mockSharedSecret = {} as CryptoKey;
    mockDeriveSharedSecret.mockResolvedValue(mockSharedSecret);

    // decryptMessage THROWS — simulating AES-GCM auth failure from wrong shared secret
    mockDecryptMessage.mockRejectedValue(new Error('The operation failed for an operation-specific reason'));

    const ownMessage = makeMessage({ sender_id: CURRENT_USER_ID });
    const supabase = makeSupabase();
    const ref = makeRef({ participant_1_id: CURRENT_USER_ID, participant_2_id: OTHER_USER_ID });

    const result = await decryptMessage(ownMessage, 'conv-1', supabase, ref);

    expect(result).not.toBeNull();
    expect(result!.decryptionError).toBe(true);
    expect(result!.content).toBe('Encrypted with previous keys');
    // This is the bug fix: isOwn must be true for own messages even after rotation
    expect(result!.isOwn).toBe(true);
    expect(result!.sender_id).toBe(CURRENT_USER_ID);
  });

  it('preserves isOwn=false in catch block for other user message after key rotation', async () => {
    const mockPrivateKey = {} as CryptoKey;
    mockEnsureKeys.mockResolvedValue({ privateKey: mockPrivateKey });
    mockGetUserPublicKey.mockResolvedValue({ kty: 'EC', crv: 'P-256' });

    const mockImportedKey = {} as CryptoKey;
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue(mockImportedKey);

    const mockSharedSecret = {} as CryptoKey;
    mockDeriveSharedSecret.mockResolvedValue(mockSharedSecret);

    // AES-GCM auth failure
    mockDecryptMessage.mockRejectedValue(new Error('The operation failed for an operation-specific reason'));

    const otherMessage = makeMessage({ sender_id: OTHER_USER_ID });
    const supabase = makeSupabase();
    const ref = makeRef({ participant_1_id: CURRENT_USER_ID, participant_2_id: OTHER_USER_ID });

    const result = await decryptMessage(otherMessage, 'conv-1', supabase, ref);

    expect(result!.decryptionError).toBe(true);
    expect(result!.content).toBe('Encrypted with previous keys');
    expect(result!.isOwn).toBe(false);
  });

  // --- Happy path ------------------------------------------------------------

  it('decrypts successfully and returns correct isOwn for own message', async () => {
    const mockPrivateKey = {} as CryptoKey;
    mockEnsureKeys.mockResolvedValue({ privateKey: mockPrivateKey });
    mockGetUserPublicKey.mockResolvedValue({ kty: 'EC', crv: 'P-256' });

    const mockImportedKey = {} as CryptoKey;
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue(mockImportedKey);

    const mockSharedSecret = {} as CryptoKey;
    mockDeriveSharedSecret.mockResolvedValue(mockSharedSecret);
    mockDecryptMessage.mockResolvedValue('Hello world');

    const ownMessage = makeMessage({ sender_id: CURRENT_USER_ID });
    const supabase = makeSupabase();
    const ref = makeRef({ participant_1_id: CURRENT_USER_ID, participant_2_id: OTHER_USER_ID });

    const result = await decryptMessage(ownMessage, 'conv-1', supabase, ref);

    expect(result).not.toBeNull();
    expect(result!.content).toBe('Hello world');
    expect(result!.isOwn).toBe(true);
    expect(result!.decryptionError).toBeUndefined();
  });

  it('returns placeholder with correct isOwn when other user has no public key', async () => {
    const mockPrivateKey = {} as CryptoKey;
    mockEnsureKeys.mockResolvedValue({ privateKey: mockPrivateKey });
    mockGetUserPublicKey.mockResolvedValue(null); // No public key

    const ownMessage = makeMessage({ sender_id: CURRENT_USER_ID });
    const supabase = makeSupabase();
    const ref = makeRef({ participant_1_id: CURRENT_USER_ID, participant_2_id: OTHER_USER_ID });

    const result = await decryptMessage(ownMessage, 'conv-1', supabase, ref);

    expect(result!.decryptionError).toBe(true);
    expect(result!.isOwn).toBe(true);
    expect(result!.content).toContain('sender encryption keys unavailable');
  });
});
