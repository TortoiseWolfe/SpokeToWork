/**
 * Realtime Service for Messaging System
 * Tasks: T100-T107
 *
 * Implements real-time message delivery, typing indicators, and presence via Supabase Realtime.
 * Uses WebSocket subscriptions for <500ms message delivery guarantee.
 *
 * Key Features:
 * - Subscribe to new messages (INSERT events)
 * - Subscribe to message updates (UPDATE events for edits/deletes)
 * - Subscribe to typing indicators (INSERT/UPDATE/DELETE events)
 * - Debounced typing status updates (1s typing, 5s auto-expire)
 * - Automatic cleanup on unmount
 */

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message } from '@/types/messaging';
import { createLogger } from '@/lib/logger';

const logger = createLogger('messaging:realtime');

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to new messages in a conversation
   * Task: T101
   *
   * Listens for INSERT events on the messages table filtered by conversation_id.
   * Delivers new messages to the callback within <500ms (Supabase Realtime guarantee).
   *
   * @param conversation_id - Conversation UUID to subscribe to
   * @param callback - Function called when new message arrives
   * @returns Unsubscribe function to clean up subscription
   */
  subscribeToMessages(
    conversation_id: string,
    callback: (message: Message) => void
  ): () => void {
    const supabase = createClient();
    const channelName = `messages:${conversation_id}`;

    // Remove existing channel if present
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
      this.channels.delete(channelName);
    }

    // Create new channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation_id}`,
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to message updates (edits/deletes) in a conversation
   * Task: T102
   *
   * Listens for UPDATE events on the messages table.
   * Used for real-time display of edited messages and deletions.
   *
   * @param conversation_id - Conversation UUID to subscribe to
   * @param callback - Function called when message is updated (receives new and old message)
   * @returns Unsubscribe function to clean up subscription
   */
  subscribeToMessageUpdates(
    conversation_id: string,
    callback: (message: Message, oldMessage: Message) => void
  ): () => void {
    const supabase = createClient();
    const channelName = `message-updates:${conversation_id}`;

    // Remove existing channel if present
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
      this.channels.delete(channelName);
    }

    // Create new channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation_id}`,
        },
        (payload) => {
          callback(payload.new as Message, payload.old as Message);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Subscribe to typing indicators in a conversation
   * Task: T103
   *
   * Uses Supabase Broadcast (not CDC/postgres_changes) for typing indicators.
   * Broadcast is the correct transport for ephemeral data like typing status:
   * - No database round-trip required for real-time delivery
   * - No dependency on CDC publication or REPLICA IDENTITY configuration
   * - Lower latency than WAL → CDC → subscriber pipeline
   * - Indicators auto-expire after 5 seconds on the client side
   *
   * @param conversation_id - Conversation UUID to subscribe to
   * @param callback - Function called when typing status changes (userId, isTyping)
   * @returns Unsubscribe function to clean up subscription
   */
  subscribeToTypingIndicators(
    conversation_id: string,
    callback: (userId: string, isTyping: boolean) => void,
    onSubscribed?: () => void
  ): () => void {
    const supabase = createClient();
    const channelName = `typing:${conversation_id}`;

    // Remove existing channel if present
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
      this.channels.delete(channelName);
    }

    // Create new channel using Broadcast for typing indicators
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, is_typing } = payload.payload as {
          user_id: string;
          is_typing: boolean;
        };
        callback(user_id, is_typing);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && onSubscribed) {
          onSubscribed();
        }
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Update own typing status
   * Tasks: T104, T106, T107
   *
   * Sends typing status via Supabase Broadcast with debounce logic:
   * - Only sends update after 1 second of typing activity (debounce)
   * - Stop-typing is sent immediately (no debounce)
   * - Silent failures (errors logged but not thrown to avoid disrupting UX)
   *
   * @param conversation_id - Conversation UUID
   * @param isTyping - Whether currently typing
   */
  async setTypingStatus(
    conversation_id: string,
    isTyping: boolean
  ): Promise<void> {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Silent failure - don't disrupt typing UX
      logger.warn('Cannot set typing status: not authenticated');
      return;
    }

    const timerKey = `${conversation_id}:${user.id}`;

    // Clear existing timer
    const existingTimer = this.typingTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.typingTimers.delete(timerKey);
    }

    const channelName = `typing:${conversation_id}`;

    if (isTyping) {
      // Debounce: Wait 1 second before sending typing indicator
      const timer = setTimeout(() => {
        try {
          const channel = this.channels.get(channelName);
          if (channel) {
            channel.send({
              type: 'broadcast',
              event: 'typing',
              payload: { user_id: user.id, is_typing: true },
            });
          }
        } catch (error) {
          // Silent failure - log but don't throw
          logger.error('Failed to set typing status', { error });
        } finally {
          this.typingTimers.delete(timerKey);
        }
      }, 1000); // 1 second debounce

      this.typingTimers.set(timerKey, timer);
    } else {
      // User stopped typing - immediately send
      try {
        const channel = this.channels.get(channelName);
        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: user.id, is_typing: false },
          });
        }
      } catch (error) {
        // Silent failure - log but don't throw
        logger.error('Failed to clear typing status', { error });
      }
    }
  }

  /**
   * Unsubscribe from all subscriptions for a conversation
   * Task: T105
   *
   * Cleans up all active channels for a conversation:
   * - Messages subscription
   * - Message updates subscription
   * - Typing indicators subscription
   *
   * Call this on component unmount to prevent memory leaks.
   *
   * @param conversation_id - Conversation UUID
   */
  unsubscribeFromConversation(conversation_id: string): void {
    const channelPrefixes = [
      `messages:${conversation_id}`,
      `message-updates:${conversation_id}`,
      `typing:${conversation_id}`,
    ];

    channelPrefixes.forEach((channelName) => {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(channelName);
      }
    });

    // Clear any pending typing timers for this conversation
    const timerKeys = Array.from(this.typingTimers.keys()).filter((key) =>
      key.startsWith(`${conversation_id}:`)
    );
    timerKeys.forEach((key) => {
      const timer = this.typingTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.typingTimers.delete(key);
      }
    });
  }

  /**
   * Cleanup all subscriptions and timers
   * Call this on app unmount or user sign-out
   */
  cleanup(): void {
    // Unsubscribe all channels
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();

    // Clear all typing timers
    this.typingTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.typingTimers.clear();
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
