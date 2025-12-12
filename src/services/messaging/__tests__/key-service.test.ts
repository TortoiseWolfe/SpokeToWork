/**
 * Unit tests for KeyManagementService
 * Tasks: T055-T059, Feature 032 (T007)
 *
 * Tests password-derived key management:
 * - initializeKeys() - new user key generation
 * - deriveKeys() - login key derivation
 * - getCurrentKeys() - memory key access
 * - clearKeys() - logout key clearing
 * - revokeKeys() - key revocation
 * - needsMigration() - legacy key detection
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from 'vitest';
import { KeyManagementService } from '../key-service';
import { createClient } from '@/lib/supabase/client';
import { createMessagingClient } from '@/lib/supabase/messaging-client';
import { encryptionService } from '@/lib/messaging/encryption';
import { KeyDerivationService } from '@/lib/messaging/key-derivation';
import {
  AuthenticationError,
  KeyDerivationError,
  KeyMismatchError,
  ConnectionError,
} from '@/types/messaging';

// Use vi.hoisted to create mock that can be referenced in vi.mock (vitest 4.0 pattern)
const { mockKeyDerivationInstance } = vi.hoisted(() => ({
  mockKeyDerivationInstance: {
    generateSalt: vi.fn(),
    deriveKeyPair: vi.fn(),
    verifyPublicKey: vi.fn(),
  },
}));

// Mock all dependencies
vi.mock('@/lib/supabase/client');
vi.mock('@/lib/supabase/messaging-client');
vi.mock('@/lib/messaging/encryption');
vi.mock('@/lib/messaging/key-derivation', () => ({
  KeyDerivationService: class MockKeyDerivationService {
    generateSalt = mockKeyDerivationInstance.generateSalt;
    deriveKeyPair = mockKeyDerivationInstance.deriveKeyPair;
    verifyPublicKey = mockKeyDerivationInstance.verifyPublicKey;
  },
}));

describe('KeyManagementService', () => {
  let keyService: KeyManagementService;
  let mockSupabase: any;
  let mockMsgClient: any;

  // Real cryptographic keys generated at test startup
  let realKeyPair: CryptoKeyPair;
  let realPublicKeyJwk: JsonWebKey;
  let realPrivateKeyJwk: JsonWebKey;

  const mockUserId = 'user-123';
  const mockPassword = 'SecurePassword123!';
  const mockSalt = 'bW9jay1zYWx0LWJhc2U2NA=='; // base64 "mock-salt-base64"

  // Generate REAL ECDH P-256 keys before all tests
  beforeAll(async () => {
    realKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits', 'deriveKey']
    );
    realPublicKeyJwk = await crypto.subtle.exportKey(
      'jwk',
      realKeyPair.publicKey
    );
    realPrivateKeyJwk = await crypto.subtle.exportKey(
      'jwk',
      realKeyPair.privateKey
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Configure the hoisted mock with test values (using real keys generated in beforeAll)
    mockKeyDerivationInstance.generateSalt.mockReturnValue(mockSalt);
    mockKeyDerivationInstance.deriveKeyPair.mockResolvedValue({
      publicKey: realKeyPair.publicKey,
      privateKey: realKeyPair.privateKey,
      publicKeyJwk: realPublicKeyJwk,
      salt: mockSalt,
    });
    mockKeyDerivationInstance.verifyPublicKey.mockReturnValue(true); // Default: keys match

    // Now create keyService - it will use the mocked KeyDerivationService
    keyService = new KeyManagementService();

    // Setup Supabase mock
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: mockUserId,
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      },
      from: vi.fn(),
    };

    mockMsgClient = {
      from: vi.fn(),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase);
    vi.mocked(createMessagingClient).mockReturnValue(mockMsgClient);

    // Mock encryption service with REAL keys
    vi.mocked(encryptionService.exportPublicKey).mockResolvedValue(
      realPublicKeyJwk
    );
    vi.mocked(encryptionService.storePrivateKey).mockResolvedValue(undefined);
    vi.mocked(encryptionService.getPrivateKey).mockResolvedValue(
      realPrivateKeyJwk
    );
    vi.mocked(encryptionService.deletePrivateKey).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear any stored keys
    keyService.clearKeys();
  });

  describe('initializeKeys()', () => {
    beforeEach(() => {
      // Mock no existing keys in database
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116', message: 'No rows found' },
                      }),
                    }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        return { select: vi.fn() };
      });
    });

    it('should initialize keys for new user (T007)', async () => {
      const result = await keyService.initializeKeys(mockPassword);

      // Verify keys are returned
      expect(result).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(result.privateKey).toBeDefined();

      // Verify keys are now available in memory
      const keys = keyService.getCurrentKeys();
      expect(keys).toBeDefined();
      expect(keys?.publicKey).toBeDefined();
      expect(keys?.privateKey).toBeDefined();
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(keyService.initializeKeys(mockPassword)).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should throw error if keys already exist', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          user_id: mockUserId,
                          public_key: realPublicKeyJwk,
                          encryption_salt: mockSalt,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(keyService.initializeKeys(mockPassword)).rejects.toThrow();
    });

    it('should store salt and public key in database', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    }),
                  }),
                }),
              }),
            }),
            insert: insertMock,
          };
        }
        return { select: vi.fn() };
      });

      await keyService.initializeKeys(mockPassword);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          encryption_salt: expect.any(String),
        })
      );
    });
  });

  describe('deriveKeys()', () => {
    beforeEach(() => {
      // Mock existing keys in database
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          user_id: mockUserId,
                          public_key: realPublicKeyJwk,
                          encryption_salt: mockSalt,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });
    });

    it('should derive keys from password and stored salt (T055)', async () => {
      const result = await keyService.deriveKeys(mockPassword);

      expect(result).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(result.privateKey).toBeDefined();

      // Keys should now be available
      const keys = keyService.getCurrentKeys();
      expect(keys).toBeDefined();
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(keyService.deriveKeys(mockPassword)).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should throw KeyDerivationError if no keys exist', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(keyService.deriveKeys(mockPassword)).rejects.toThrow(
        KeyDerivationError
      );
    });

    it('should throw KeyMismatchError if derived key does not match stored key', async () => {
      // Override verifyPublicKey to return false for this test
      mockKeyDerivationInstance.verifyPublicKey.mockReturnValue(false); // Keys DON'T match!
      // Create new service instance with mismatch mock
      const mismatchService = new KeyManagementService();

      // Generate a different key pair to simulate mismatch in database
      const differentKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits', 'deriveKey']
      );
      const differentPublicKeyJwk = await crypto.subtle.exportKey(
        'jwk',
        differentKeyPair.publicKey
      );

      // Mock different public key in database
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          user_id: mockUserId,
                          public_key: differentPublicKeyJwk, // Different key!
                          encryption_salt: mockSalt,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(mismatchService.deriveKeys(mockPassword)).rejects.toThrow(
        KeyMismatchError
      );
    });
  });

  describe('getCurrentKeys()', () => {
    it('should return null when no keys are derived', () => {
      const keys = keyService.getCurrentKeys();
      expect(keys).toBeNull();
    });

    it('should return keys after derivation', async () => {
      // Setup mocks for deriveKeys
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          user_id: mockUserId,
                          public_key: realPublicKeyJwk,
                          encryption_salt: mockSalt,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await keyService.deriveKeys(mockPassword);

      const keys = keyService.getCurrentKeys();
      expect(keys).toBeDefined();
      expect(keys?.publicKey).toBeDefined();
      expect(keys?.privateKey).toBeDefined();
    });
  });

  describe('clearKeys()', () => {
    it('should clear keys from memory', async () => {
      // First derive keys
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          user_id: mockUserId,
                          public_key: realPublicKeyJwk,
                          encryption_salt: mockSalt,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await keyService.deriveKeys(mockPassword);
      expect(keyService.getCurrentKeys()).toBeDefined();

      // Clear keys
      keyService.clearKeys();
      expect(keyService.getCurrentKeys()).toBeNull();
    });
  });

  describe('revokeKeys()', () => {
    beforeEach(() => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });
    });

    it('should revoke keys and delete from IndexedDB (T059)', async () => {
      await keyService.revokeKeys();

      // Verify IndexedDB deletion was called
      expect(encryptionService.deletePrivateKey).toHaveBeenCalledWith(
        mockUserId
      );
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(keyService.revokeKeys()).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should throw ConnectionError on database failure', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: new Error('Database error'),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(keyService.revokeKeys()).rejects.toThrow(ConnectionError);
    });
  });

  describe('getUserPublicKey()', () => {
    it('should return public key for user', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      // getUserPublicKey uses .single() not .maybeSingle()
                      single: vi.fn().mockResolvedValue({
                        data: {
                          public_key: realPublicKeyJwk,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const publicKey = await keyService.getUserPublicKey('other-user-id');
      expect(publicKey).toEqual(realPublicKeyJwk);
    });

    it('should return null if user has no keys', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      // getUserPublicKey uses .single() not .maybeSingle()
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const publicKey = await keyService.getUserPublicKey('no-keys-user');
      expect(publicKey).toBeNull();
    });
  });

  describe('needsMigration()', () => {
    // needsMigration() makes TWO queries:
    // 1. Check for keys WITH salt: .select('id').eq().eq().not('encryption_salt', 'is', null).limit(1)
    // 2. Check for ANY keys: .select('id').eq().eq().limit(1)
    // Both return arrays (no .single() or .maybeSingle())

    it('should return false for password-derived keys', async () => {
      // User has keys with salt - query 1 finds keys, returns false immediately
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [{ id: 'key-123' }], // Found valid key with salt
                      error: null,
                    }),
                  }),
                  // Also mock direct limit() for second query
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'key-123' }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const needsMigration = await keyService.needsMigration();
      expect(needsMigration).toBe(false);
    });

    it('should return true for legacy random keys (no salt)', async () => {
      // User has keys WITHOUT salt - query 1 returns empty, query 2 finds keys
      const callCount = 0;
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [], // No keys with salt found
                      error: null,
                    }),
                  }),
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'legacy-key' }], // But has legacy keys without salt
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const needsMigration = await keyService.needsMigration();
      expect(needsMigration).toBe(true);
    });

    it('should return false if no keys exist', async () => {
      // User has no keys at all - both queries return empty
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'user_encryption_keys') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [], // No keys with salt
                      error: null,
                    }),
                  }),
                  limit: vi.fn().mockResolvedValue({
                    data: [], // No keys at all
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const needsMigration = await keyService.needsMigration();
      expect(needsMigration).toBe(false);
    });
  });
});
