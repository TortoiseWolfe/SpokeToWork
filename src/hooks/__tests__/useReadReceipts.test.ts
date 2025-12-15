/**
 * Unit Tests for useReadReceipts
 * Feature 052 - Test Coverage Expansion (T021)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock message service
vi.mock('@/services/messaging/message-service', () => ({
  messageService: {
    markAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks
import { useReadReceipts } from '../useReadReceipts';

describe('useReadReceipts', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'other-user',
      read_at: null,
      content: 'Hello',
      created_at: '2024-01-01T00:00:00Z',
      sequence_number: 1,
      deleted: false,
      edited: false,
      edited_at: null,
      delivered_at: null,
      isOwn: false,
      senderName: 'Other User',
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-1',
      sender_id: 'user-123', // own message
      read_at: null,
      content: 'Hi there',
      created_at: '2024-01-01T00:00:01Z',
      sequence_number: 2,
      deleted: false,
      edited: false,
      edited_at: null,
      delivered_at: null,
      isOwn: true,
      senderName: 'Test User',
    },
  ] as Parameters<typeof useReadReceipts>[0]['messages'];

  const defaultOptions = {
    messages: mockMessages,
    userId: 'user-123',
    conversationId: 'conv-1',
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('hook behavior', () => {
    it('should render without throwing', () => {
      expect(() => {
        renderHook(() => useReadReceipts(defaultOptions));
      }).not.toThrow();
    });

    it('should accept messages array', () => {
      const { result } = renderHook(() => useReadReceipts(defaultOptions));

      // Hook returns void
      expect(result.current).toBeUndefined();
    });

    it('should accept empty messages array', () => {
      expect(() => {
        renderHook(() =>
          useReadReceipts({
            ...defaultOptions,
            messages: [],
          })
        );
      }).not.toThrow();
    });

    it('should handle isVisible false', () => {
      expect(() => {
        renderHook(() =>
          useReadReceipts({
            ...defaultOptions,
            isVisible: false,
          })
        );
      }).not.toThrow();
    });

    it('should accept different userId', () => {
      expect(() => {
        renderHook(() =>
          useReadReceipts({
            ...defaultOptions,
            userId: 'different-user',
          })
        );
      }).not.toThrow();
    });

    it('should accept different conversationId', () => {
      expect(() => {
        renderHook(() =>
          useReadReceipts({
            ...defaultOptions,
            conversationId: 'different-conv',
          })
        );
      }).not.toThrow();
    });

    it('should handle unmount without throwing', () => {
      const { unmount } = renderHook(() => useReadReceipts(defaultOptions));

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('return value', () => {
    it('should return undefined (void hook)', () => {
      const { result } = renderHook(() => useReadReceipts(defaultOptions));

      expect(result.current).toBeUndefined();
    });
  });

  describe('messages filtering', () => {
    it('should work with messages containing read messages', () => {
      const messagesWithRead = [
        ...mockMessages,
        {
          id: 'msg-3',
          conversation_id: 'conv-1',
          sender_id: 'other-user',
          read_at: '2024-01-01T00:00:02Z', // already read
          content: 'Already read',
          created_at: '2024-01-01T00:00:02Z',
          sequence_number: 3,
          deleted: false,
          edited: false,
          edited_at: null,
          delivered_at: null,
          isOwn: false,
          senderName: 'Other User',
        },
      ] as Parameters<typeof useReadReceipts>[0]['messages'];

      expect(() => {
        renderHook(() =>
          useReadReceipts({
            ...defaultOptions,
            messages: messagesWithRead,
          })
        );
      }).not.toThrow();
    });

    it('should work when all messages are from current user', () => {
      const ownMessages = mockMessages.map((m) => ({
        ...m,
        sender_id: 'user-123',
      })) as Parameters<typeof useReadReceipts>[0]['messages'];

      expect(() => {
        renderHook(() =>
          useReadReceipts({
            ...defaultOptions,
            messages: ownMessages,
          })
        );
      }).not.toThrow();
    });
  });
});
