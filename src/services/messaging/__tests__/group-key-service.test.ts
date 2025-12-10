/**
 * GroupKeyService Tests
 * Tests for symmetric key encryption in group chats
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { GroupKeyService } from '../group-key-service';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

vi.mock('@/lib/supabase/messaging-client', () => ({
  createMessagingClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

vi.mock('@/lib/messaging/encryption', () => ({
  encryptionService: {
    deriveSharedSecret: vi.fn(),
    encryptWithKey: vi.fn(),
    decryptWithKey: vi.fn(),
    getPrivateKey: vi.fn(),
  },
}));

vi.mock('@/services/messaging/key-service', () => ({
  keyManagementService: {
    getCurrentKeys: vi.fn(),
    getUserPublicKey: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('GroupKeyService', () => {
  let service: GroupKeyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GroupKeyService();
  });

  describe('generateGroupKey', () => {
    it('generates a valid AES-GCM-256 CryptoKey', async () => {
      const key = await service.generateGroupKey();

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
      expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
      expect(key.extractable).toBe(true);
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });

    it('generates unique keys each time', async () => {
      const key1 = await service.generateGroupKey();
      const key2 = await service.generateGroupKey();

      // Export and compare raw bytes
      const bytes1 = await crypto.subtle.exportKey('raw', key1);
      const bytes2 = await crypto.subtle.exportKey('raw', key2);

      expect(Buffer.from(bytes1)).not.toEqual(Buffer.from(bytes2));
    });
  });

  describe('exportKeyBytes / importKeyBytes', () => {
    it('exports key to ArrayBuffer', async () => {
      const key = await service.generateGroupKey();
      const bytes = await service.exportKeyBytes(key);

      expect(bytes).toBeInstanceOf(ArrayBuffer);
      expect(bytes.byteLength).toBe(32); // 256 bits = 32 bytes
    });

    it('imports ArrayBuffer back to CryptoKey', async () => {
      const originalKey = await service.generateGroupKey();
      const bytes = await service.exportKeyBytes(originalKey);
      const importedKey = await service.importKeyBytes(bytes);

      expect(importedKey.type).toBe('secret');
      expect(importedKey.algorithm.name).toBe('AES-GCM');

      // Verify it produces same bytes
      const reimported = await crypto.subtle.exportKey('raw', importedKey);
      expect(Buffer.from(reimported)).toEqual(Buffer.from(bytes));
    });

    it('imports Uint8Array', async () => {
      const originalKey = await service.generateGroupKey();
      const bytes = await service.exportKeyBytes(originalKey);
      const uint8Array = new Uint8Array(bytes);

      const importedKey = await service.importKeyBytes(uint8Array);
      expect(importedKey.type).toBe('secret');
    });
  });

  describe('GroupKeyCache (via service)', () => {
    it('caches group keys', async () => {
      const key = await service.generateGroupKey();
      const conversationId = 'test-conv-123';
      const version = 1;

      // Access cache through service internals (testing cache behavior)
      // @ts-expect-error - accessing private for testing
      service.keyCache.set(conversationId, version, key);

      // @ts-expect-error - accessing private for testing
      const cached = service.keyCache.get(conversationId, version);
      expect(cached).toBeDefined();
      expect(cached?.key).toBe(key);
      expect(cached?.version).toBe(version);
    });

    it('returns undefined for missing cache entries', () => {
      // @ts-expect-error - accessing private for testing
      const cached = service.keyCache.get('nonexistent', 1);
      expect(cached).toBeUndefined();
    });

    it('clears all cached keys', async () => {
      const key = await service.generateGroupKey();
      // @ts-expect-error - accessing private for testing
      service.keyCache.set('conv-1', 1, key);
      // @ts-expect-error - accessing private for testing
      service.keyCache.set('conv-2', 1, key);

      // @ts-expect-error - accessing private for testing
      expect(service.keyCache.size()).toBe(2);

      // @ts-expect-error - accessing private for testing
      service.keyCache.clear();

      // @ts-expect-error - accessing private for testing
      expect(service.keyCache.size()).toBe(0);
    });
  });

  // Note: More complex methods like encryptGroupKeyForMember, decryptGroupKey,
  // distributeGroupKey, etc. require full crypto mocking with real key pairs
  // which is covered by E2E messaging tests
});
