/**
 * Unit Tests for RealtimeService
 * Task: T120
 *
 * Tests real-time message delivery, typing indicators, and subscription management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeService } from '../realtime';
import type { Message } from '@/types/messaging';

// Mock Supabase client
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
  send: vi.fn().mockResolvedValue('ok'),
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })
    ),
  },
  from: vi.fn(() => ({
    upsert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('RealtimeService', () => {
  let service: RealtimeService;
  const conversationId = 'test-conversation-id';

  beforeEach(() => {
    service = new RealtimeService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('subscribeToMessages', () => {
    it('should subscribe to new messages on INSERT events', () => {
      const callback = vi.fn();

      service.subscribeToMessages(conversationId, callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `messages:${conversationId}`
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should call callback when new message arrives', () => {
      const callback = vi.fn();
      let insertHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, handler) => {
        if (config.event === 'INSERT') {
          insertHandler = handler;
        }
        return mockChannel;
      });

      service.subscribeToMessages(conversationId, callback);

      const mockMessage: Message = {
        id: 'msg-1',
        conversation_id: conversationId,
        sender_id: 'user-1',
        encrypted_content: 'encrypted',
        initialization_vector: 'iv',
        sequence_number: 1,
        deleted: false,
        edited: false,
        edited_at: null,
        delivered_at: new Date().toISOString(),
        read_at: null,
        created_at: new Date().toISOString(),
        key_version: 1,
        is_system_message: false,
        system_message_type: null,
      };

      insertHandler!({ new: mockMessage });

      expect(callback).toHaveBeenCalledWith(mockMessage);
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();

      const unsubscribe = service.subscribeToMessages(conversationId, callback);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToMessageUpdates', () => {
    it('should subscribe to message updates on UPDATE events', () => {
      const callback = vi.fn();

      service.subscribeToMessageUpdates(conversationId, callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `message-updates:${conversationId}`
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        expect.any(Function)
      );
    });

    it('should call callback with new and old message on update', () => {
      const callback = vi.fn();
      let updateHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, handler) => {
        if (config.event === 'UPDATE') {
          updateHandler = handler;
        }
        return mockChannel;
      });

      service.subscribeToMessageUpdates(conversationId, callback);

      const oldMessage: Message = {
        id: 'msg-1',
        conversation_id: conversationId,
        sender_id: 'user-1',
        encrypted_content: 'old-encrypted',
        initialization_vector: 'iv',
        sequence_number: 1,
        deleted: false,
        edited: false,
        edited_at: null,
        delivered_at: new Date().toISOString(),
        read_at: null,
        created_at: new Date().toISOString(),
        key_version: 1,
        is_system_message: false,
        system_message_type: null,
      };

      const newMessage: Message = {
        ...oldMessage,
        encrypted_content: 'new-encrypted',
        edited: true,
        edited_at: new Date().toISOString(),
      };

      updateHandler!({ new: newMessage, old: oldMessage });

      expect(callback).toHaveBeenCalledWith(newMessage, oldMessage);
    });
  });

  describe('subscribeToTypingIndicators', () => {
    it('should subscribe to broadcast typing events', () => {
      const callback = vi.fn();

      service.subscribeToTypingIndicators(conversationId, callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `typing:${conversationId}`
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'typing' },
        expect.any(Function)
      );
    });

    it('should call callback when user starts typing', () => {
      const callback = vi.fn();
      let typingHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, handler) => {
        if (event === 'broadcast' && config.event === 'typing') {
          typingHandler = handler;
        }
        return mockChannel;
      });

      service.subscribeToTypingIndicators(conversationId, callback);

      typingHandler!({
        payload: { user_id: 'user-2', is_typing: true },
      });

      expect(callback).toHaveBeenCalledWith('user-2', true);
    });

    it('should call callback when user stops typing', () => {
      const callback = vi.fn();
      let typingHandler: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, handler) => {
        if (event === 'broadcast' && config.event === 'typing') {
          typingHandler = handler;
        }
        return mockChannel;
      });

      service.subscribeToTypingIndicators(conversationId, callback);

      typingHandler!({
        payload: { user_id: 'user-2', is_typing: false },
      });

      expect(callback).toHaveBeenCalledWith('user-2', false);
    });
  });

  describe('setTypingStatus', () => {
    it('should debounce typing status updates by 1 second', async () => {
      vi.useFakeTimers();

      // Subscribe first to create the channel
      service.subscribeToTypingIndicators(conversationId, vi.fn());

      await service.setTypingStatus(conversationId, true);

      // Should not send broadcast immediately
      expect(mockChannel.send).not.toHaveBeenCalled();

      // Fast-forward 1 second
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: 'test-user-id', is_typing: true },
      });

      vi.useRealTimers();
    });

    it('should immediately send stop-typing when isTyping=false', async () => {
      // Subscribe first to create the channel
      service.subscribeToTypingIndicators(conversationId, vi.fn());

      await service.setTypingStatus(conversationId, false);

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: 'test-user-id', is_typing: false },
      });
    });

    it('should handle authentication errors silently', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null } as any,
        error: null as any, // Type override for test
      });

      // Should not throw
      await expect(
        service.setTypingStatus(conversationId, true)
      ).resolves.toBeUndefined();
    });
  });

  describe('unsubscribeFromConversation', () => {
    it('should unsubscribe from all conversation channels', () => {
      const callback = vi.fn();

      service.subscribeToMessages(conversationId, callback);
      service.subscribeToMessageUpdates(conversationId, callback);
      service.subscribeToTypingIndicators(conversationId, callback);

      service.unsubscribeFromConversation(conversationId);

      // Should unsubscribe 3 times (messages, updates, typing)
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(3);
    });

    it('should clear pending typing timers', async () => {
      vi.useFakeTimers();

      // Subscribe first to create the channel
      service.subscribeToTypingIndicators(conversationId, vi.fn());

      await service.setTypingStatus(conversationId, true);

      service.unsubscribeFromConversation(conversationId);

      // Fast-forward past debounce
      vi.advanceTimersByTime(1000);

      // Broadcast should not be sent (timer was cleared)
      expect(mockChannel.send).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe all channels and clear all timers', async () => {
      vi.useFakeTimers();

      const callback = vi.fn();
      service.subscribeToMessages('conv-1', callback);
      service.subscribeToMessages('conv-2', callback);
      // Subscribe to typing first so the channel exists for setTypingStatus
      service.subscribeToTypingIndicators('conv-1', vi.fn());
      await service.setTypingStatus('conv-1', true);

      service.cleanup();

      // 3 channels: 2 messages + 1 typing
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(3);

      // Fast-forward past debounce
      vi.advanceTimersByTime(1000);

      // Broadcast should not be sent (timers cleared)
      expect(mockChannel.send).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
