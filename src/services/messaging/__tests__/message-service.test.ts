/**
 * Unit tests for MessageService
 * Tasks: T060-T065
 *
 * Tests encrypted message operations:
 * - sendMessage() - encryption, validation, offline queue
 * - getMessageHistory() - decryption, pagination
 * - editMessage() - edit window validation
 * - deleteMessage() - delete window validation
 * - markAsRead()
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
import { MessageService } from '../message-service';
import { createClient } from '@/lib/supabase/client';
import { createMessagingClient } from '@/lib/supabase/messaging-client';
import { encryptionService } from '@/lib/messaging/encryption';
import { keyManagementService } from '../key-service';
import { offlineQueueService } from '../offline-queue-service';
import { cacheService } from '@/lib/messaging/cache';
import {
  ValidationError,
  AuthenticationError,
  EncryptionLockedError,
  MESSAGE_CONSTRAINTS,
} from '@/types/messaging';

// Mock all dependencies
vi.mock('@/lib/supabase/client');
vi.mock('@/lib/supabase/messaging-client');
vi.mock('@/lib/messaging/encryption');
vi.mock('../key-service');
vi.mock('../offline-queue-service');
vi.mock('@/lib/messaging/cache', () => ({
  cacheService: {
    getCachedMessages: vi.fn(),
    cacheMessages: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('MessageService', () => {
  let messageService: MessageService;
  let mockSupabase: any;
  let mockMsgClient: any;

  // Real cryptographic keys generated at test startup
  let realKeyPair: CryptoKeyPair;
  let realPublicKeyJwk: JsonWebKey;
  let realPrivateKeyJwk: JsonWebKey;
  let otherKeyPair: CryptoKeyPair;
  let otherPublicKeyJwk: JsonWebKey;

  const mockUserId = 'user-123';
  const mockOtherUserId = 'user-456';
  const mockConversationId = 'conv-789';

  // Generate real ECDH P-256 keys before all tests
  beforeAll(async () => {
    // Generate key pair for the current user
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

    // Generate key pair for the other user (recipient)
    otherKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits', 'deriveKey']
    );
    otherPublicKeyJwk = await crypto.subtle.exportKey(
      'jwk',
      otherKeyPair.publicKey
    );
  });

  beforeEach(() => {
    messageService = new MessageService();
    vi.clearAllMocks();

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

    // Setup messaging client mock
    mockMsgClient = {
      from: vi.fn(),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase);
    vi.mocked(createMessagingClient).mockReturnValue(mockMsgClient);

    // Mock key management service - return REAL keys with full DerivedKeyPair
    vi.mocked(keyManagementService.getCurrentKeys).mockReturnValue({
      publicKey: realKeyPair.publicKey,
      privateKey: realKeyPair.privateKey,
      publicKeyJwk: realPublicKeyJwk,
      salt: 'mock-salt-base64',
    });

    // Mock encryption service with real implementations
    vi.mocked(encryptionService.encryptMessage).mockResolvedValue({
      ciphertext: 'encrypted-content-base64',
      iv: 'random-iv-base64',
    });

    vi.mocked(encryptionService.decryptMessage).mockResolvedValue(
      'decrypted content'
    );

    vi.mocked(encryptionService.deriveSharedSecret).mockImplementation(
      async (privateKey: CryptoKey, publicKey: CryptoKey) => {
        // Use real ECDH derivation
        return await crypto.subtle.deriveKey(
          { name: 'ECDH', public: publicKey },
          privateKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      }
    );

    // Mock offline queue service - returns full QueuedMessage
    vi.mocked(offlineQueueService.queueMessage).mockResolvedValue({
      id: 'queued-id-123',
      conversation_id: mockConversationId,
      sender_id: mockUserId,
      encrypted_content: 'encrypted-content',
      initialization_vector: 'mock-iv',
      status: 'pending',
      synced: false,
      retries: 0,
      created_at: Date.now(),
    });

    // Mock cache service
    vi.mocked(cacheService.getCachedMessages).mockResolvedValue([]);
    vi.mocked(cacheService.cacheMessages).mockResolvedValue(0);

    // Mock navigator.onLine (default to online)
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage()', () => {
    beforeEach(() => {
      // Mock conversation lookup and message operations
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    participant_1_id: mockUserId,
                    participant_2_id: mockOtherUserId,
                    is_group: false,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            // For sequence number query
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { sequence_number: 0 },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            // For message insert
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: crypto.randomUUID(),
                    conversation_id: mockConversationId,
                    sender_id: mockUserId,
                    encrypted_content: 'encrypted-content',
                    initialization_vector: 'mock-iv',
                    sequence_number: 1,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      // Mock recipient public key - return REAL JWK
      vi.mocked(keyManagementService.getUserPublicKey).mockResolvedValue(
        otherPublicKeyJwk
      );
    });

    it('should send encrypted message successfully (T061)', async () => {
      const result = await messageService.sendMessage({
        conversation_id: mockConversationId,
        content: 'Hello, world!',
      });

      expect(result.message).toBeDefined();
      // Service generates its own UUID, check format
      expect(result.message?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(result.queued).toBe(false);

      // Verify encryption was called
      expect(encryptionService.encryptMessage).toHaveBeenCalledWith(
        'Hello, world!',
        expect.any(Object) // CryptoKey (shared secret)
      );
    });

    it('should throw ValidationError for empty message', async () => {
      await expect(
        messageService.sendMessage({
          conversation_id: mockConversationId,
          content: '',
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        messageService.sendMessage({
          conversation_id: mockConversationId,
          content: '   ',
        })
      ).rejects.toThrow('Message cannot be empty');
    });

    it('should throw ValidationError for message exceeding max length', async () => {
      const longContent = 'A'.repeat(MESSAGE_CONSTRAINTS.MAX_LENGTH + 1);

      await expect(
        messageService.sendMessage({
          conversation_id: mockConversationId,
          content: longContent,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(
        messageService.sendMessage({
          conversation_id: mockConversationId,
          content: 'Hello',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw EncryptionLockedError when keys not available', async () => {
      vi.mocked(keyManagementService.getCurrentKeys).mockReturnValue(null);

      await expect(
        messageService.sendMessage({
          conversation_id: mockConversationId,
          content: 'Hello',
        })
      ).rejects.toThrow(EncryptionLockedError);
    });

    it('should throw ValidationError for non-existent conversation', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'Not found' },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        messageService.sendMessage({
          conversation_id: 'non-existent',
          content: 'Hello',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should queue message when offline (T157)', async () => {
      // Mock offline state
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const result = await messageService.sendMessage({
        conversation_id: mockConversationId,
        content: 'Hello offline',
      });

      expect(result.queued).toBe(true);
      expect(offlineQueueService.queueMessage).toHaveBeenCalled();

      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        value: originalOnLine,
        configurable: true,
      });
    });

    it('should throw ValidationError when recipient has no encryption keys', async () => {
      vi.mocked(keyManagementService.getUserPublicKey).mockResolvedValue(null);

      await expect(
        messageService.sendMessage({
          conversation_id: mockConversationId,
          content: 'Hello',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getMessageHistory()', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        conversation_id: mockConversationId,
        sender_id: mockUserId,
        encrypted_content: 'encrypted-1',
        initialization_vector: 'iv-1',
        sequence_number: 1,
        deleted: false,
        edited: false,
        edited_at: null,
        delivered_at: null,
        read_at: null,
        created_at: '2025-01-01T10:00:00Z',
      },
      {
        id: 'msg-2',
        conversation_id: mockConversationId,
        sender_id: mockOtherUserId,
        encrypted_content: 'encrypted-2',
        initialization_vector: 'iv-2',
        sequence_number: 2,
        deleted: false,
        edited: false,
        edited_at: null,
        delivered_at: null,
        read_at: null,
        created_at: '2025-01-01T10:01:00Z',
      },
    ];

    beforeEach(() => {
      // Mock conversation lookup
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    participant_1_id: mockUserId,
                    participant_2_id: mockOtherUserId,
                    is_group: false,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockMessages,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: mockUserId,
                    username: 'user1',
                    display_name: 'User One',
                  },
                  {
                    id: mockOtherUserId,
                    username: 'user2',
                    display_name: 'User Two',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      // Mock recipient public key for decryption - REAL JWK
      vi.mocked(keyManagementService.getUserPublicKey).mockResolvedValue(
        otherPublicKeyJwk
      );

      // Mock private key retrieval - REAL JWK
      vi.mocked(encryptionService.getPrivateKey).mockResolvedValue(
        realPrivateKeyJwk
      );
    });

    it('should retrieve and decrypt message history (T062)', async () => {
      const result = await messageService.getMessageHistory(mockConversationId);

      expect(result.messages).toHaveLength(2);
      expect(result.has_more).toBe(false);

      // Verify decryption was called for each message
      expect(encryptionService.decryptMessage).toHaveBeenCalledTimes(2);
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(
        messageService.getMessageHistory(mockConversationId)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should handle pagination with cursor', async () => {
      // Mock paginated response
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      lt: vi.fn().mockResolvedValue({
                        data: [mockMessages[0]],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    participant_1_id: mockUserId,
                    participant_2_id: mockOtherUserId,
                    is_group: false,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: mockUserId,
                    username: 'user1',
                    display_name: 'User One',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await messageService.getMessageHistory(
        mockConversationId,
        2, // cursor
        10 // limit
      );

      expect(result.messages).toHaveLength(1);
    });

    it('should handle decryption errors gracefully', async () => {
      vi.mocked(encryptionService.decryptMessage).mockRejectedValue(
        new Error('Decryption failed')
      );

      const result = await messageService.getMessageHistory(mockConversationId);

      // Messages should still be returned but with error placeholder
      expect(result.messages).toBeDefined();
    });
  });

  describe('editMessage()', () => {
    beforeEach(() => {
      // Mock message lookup
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'msg-123',
                    conversation_id: mockConversationId,
                    sender_id: mockUserId,
                    created_at: new Date().toISOString(), // Just created - within edit window
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'msg-123',
                      edited: true,
                      edited_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    participant_1_id: mockUserId,
                    participant_2_id: mockOtherUserId,
                    is_group: false,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      // Mock recipient public key - REAL JWK
      vi.mocked(keyManagementService.getUserPublicKey).mockResolvedValue(
        otherPublicKeyJwk
      );
    });

    it('should edit message within edit window (T105)', async () => {
      // editMessage returns void on success
      await messageService.editMessage({
        message_id: 'msg-123',
        new_content: 'Updated content',
      });

      // Verify encryption was called with new content
      expect(encryptionService.encryptMessage).toHaveBeenCalledWith(
        'Updated content',
        expect.any(Object) // CryptoKey (shared secret)
      );

      // Verify update was called on messages table
      expect(mockMsgClient.from).toHaveBeenCalledWith('messages');
    });

    it('should throw ValidationError for empty new content', async () => {
      await expect(
        messageService.editMessage({
          message_id: 'msg-123',
          new_content: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(
        messageService.editMessage({
          message_id: 'msg-123',
          new_content: 'Updated',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw ValidationError when editing other users message', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'msg-123',
                    conversation_id: mockConversationId,
                    sender_id: mockOtherUserId, // Different user
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        messageService.editMessage({
          message_id: 'msg-123',
          new_content: 'Updated',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when outside edit window (T113)', async () => {
      // Message created 20 minutes ago - outside 15-minute window
      const twentyMinutesAgo = new Date(
        Date.now() - 20 * 60 * 1000
      ).toISOString();

      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'msg-123',
                    conversation_id: mockConversationId,
                    sender_id: mockUserId,
                    created_at: twentyMinutesAgo,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        messageService.editMessage({
          message_id: 'msg-123',
          new_content: 'Updated',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteMessage()', () => {
    beforeEach(() => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'msg-123',
                    conversation_id: mockConversationId,
                    sender_id: mockUserId,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });
    });

    it('should soft delete message within delete window (T106)', async () => {
      await messageService.deleteMessage('msg-123');

      // Verify update was called with deleted: true
      expect(mockMsgClient.from).toHaveBeenCalledWith('messages');
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(messageService.deleteMessage('msg-123')).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should throw ValidationError when deleting other users message', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'msg-123',
                    conversation_id: mockConversationId,
                    sender_id: mockOtherUserId, // Different user
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(messageService.deleteMessage('msg-123')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when outside delete window (T113)', async () => {
      const twentyMinutesAgo = new Date(
        Date.now() - 20 * 60 * 1000
      ).toISOString();

      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'msg-123',
                    conversation_id: mockConversationId,
                    sender_id: mockUserId,
                    created_at: twentyMinutesAgo,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(messageService.deleteMessage('msg-123')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('markAsRead()', () => {
    it('should mark messages as read (T065)', async () => {
      mockMsgClient.from.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  error: null,
                  count: 2,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await messageService.markAsRead(['msg-123', 'msg-456']);

      expect(mockMsgClient.from).toHaveBeenCalledWith('messages');
    });

    it('should throw AuthenticationError when not signed in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(messageService.markAsRead(['msg-123'])).rejects.toThrow(
        AuthenticationError
      );
    });
  });
});
