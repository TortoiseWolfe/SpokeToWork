/**
 * Unit Tests for MessageQueueAdapter
 * Feature 050 - Code Consolidation
 *
 * Tests message queue functionality:
 * - Queue messages
 * - Get queue/count
 * - Sync operations
 * - Retry logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MessageQueueAdapter,
  messageQueue,
  offlineQueueService,
} from '../message-adapter';

// Mock dependencies
vi.mock('@/lib/messaging/database', () => ({
  messagingDb: {
    messaging_queued_messages: {
      add: vi.fn().mockResolvedValue('msg-123'),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          toArray: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(0),
        }),
      }),
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null,
      }),
    },
  }),
}));

vi.mock('@/lib/supabase/messaging-client', () => ({
  createMessagingClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));

describe('MessageQueueAdapter', () => {
  let queue: MessageQueueAdapter;

  beforeEach(() => {
    queue = new MessageQueueAdapter();
    vi.clearAllMocks();
  });

  describe('queueMessage()', () => {
    it('should queue message with required fields', async () => {
      const { messagingDb } = await import('@/lib/messaging/database');

      const message = {
        id: 'msg-123',
        conversation_id: 'conv-456',
        sender_id: 'user-789',
        encrypted_content: 'encrypted-data',
        initialization_vector: 'iv-data',
      };

      const result = await queue.queueMessage(message);

      expect(messagingDb.messaging_queued_messages.add).toHaveBeenCalled();
      expect(result.id).toBe(message.id);
      expect(result.status).toBe('pending');
      expect(result.synced).toBe(false);
      expect(result.retries).toBe(0);
    });
  });

  describe('getQueue()', () => {
    it('should return unsynced messages', async () => {
      const messages = await queue.getQueue();
      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('getQueueCount()', () => {
    it('should return count of queued messages', async () => {
      const count = await queue.getQueueCount();
      expect(typeof count).toBe('number');
    });

    it('should filter by status when provided', async () => {
      const count = await queue.getQueueCount('pending');
      expect(typeof count).toBe('number');
    });
  });

  describe('syncQueue()', () => {
    it('should return result object', async () => {
      const result = await queue.syncQueue();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
    });

    it('should not run concurrent syncs', async () => {
      // Start first sync
      const sync1 = queue.syncQueue();

      // Second sync should return immediately
      const sync2 = await queue.syncQueue();

      expect(sync2.success).toBe(0);
      expect(sync2.failed).toBe(0);

      await sync1;
    });
  });

  describe('getRetryDelay()', () => {
    it('should calculate exponential backoff', () => {
      // Based on OFFLINE_QUEUE_CONFIG defaults
      const delay1 = queue.getRetryDelay(1);
      const delay2 = queue.getRetryDelay(2);

      expect(delay2).toBeGreaterThan(delay1);
    });
  });

  describe('isSyncing()', () => {
    it('should return false when not syncing', () => {
      expect(queue.isSyncing()).toBe(false);
    });
  });

  describe('retryFailed()', () => {
    it('should return count of reset messages', async () => {
      const count = await queue.retryFailed();
      expect(typeof count).toBe('number');
    });
  });

  describe('clearQueue()', () => {
    it('should clear all messages', async () => {
      await expect(queue.clearQueue()).resolves.not.toThrow();
    });
  });
});

describe('Exports', () => {
  it('messageQueue should be MessageQueueAdapter instance', () => {
    expect(messageQueue).toBeInstanceOf(MessageQueueAdapter);
  });

  it('offlineQueueService should be alias for messageQueue', () => {
    expect(offlineQueueService).toBe(messageQueue);
  });
});
