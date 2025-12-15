/**
 * Message Queue Adapter
 *
 * Feature 050 - Code Consolidation
 * Handles offline queuing for encrypted messages.
 *
 * Replaces: src/services/messaging/offline-queue-service.ts
 *
 * Note: This adapter uses the existing messagingDb for backwards compatibility
 * with the messaging system's Dexie database schema.
 *
 * @module lib/offline-queue/message-adapter
 */

import { messagingDb } from '@/lib/messaging/database';
import { createClient } from '@/lib/supabase/client';
import { createMessagingClient } from '@/lib/supabase/messaging-client';
import type { QueuedMessage, QueueStatus } from '@/types/messaging';
import {
  OFFLINE_QUEUE_CONFIG,
  ConnectionError,
  AuthenticationError,
} from '@/types/messaging';
import { createLogger } from '@/lib/logger';

const logger = createLogger('offline-queue:message');

/**
 * Message queue for offline encrypted message handling
 *
 * This adapter wraps the existing messagingDb for full backwards compatibility
 * while providing the same interface as other queue adapters.
 *
 * @example
 * ```typescript
 * // Queue a message
 * await messageQueue.queueMessage({
 *   id: crypto.randomUUID(),
 *   conversation_id: '123',
 *   sender_id: user.id,
 *   encrypted_content: 'base64...',
 *   initialization_vector: 'base64...'
 * });
 *
 * // Sync when back online
 * const result = await messageQueue.syncQueue();
 * ```
 */
export class MessageQueueAdapter {
  private syncInProgress = false;

  /**
   * Add a message to the offline queue
   */
  async queueMessage(
    message: Pick<
      QueuedMessage,
      | 'id'
      | 'conversation_id'
      | 'sender_id'
      | 'encrypted_content'
      | 'initialization_vector'
    >
  ): Promise<QueuedMessage> {
    const queuedMessage: QueuedMessage = {
      ...message,
      status: 'pending' as QueueStatus,
      synced: false,
      retries: 0,
      created_at: Date.now(),
    };

    await messagingDb.messaging_queued_messages.add(queuedMessage);
    logger.debug('Message queued', { id: message.id });
    return queuedMessage;
  }

  /**
   * Get all unsynced messages from the queue
   */
  async getQueue(): Promise<QueuedMessage[]> {
    return await messagingDb.messaging_queued_messages
      .where('synced')
      .equals(0)
      .sortBy('created_at');
  }

  /**
   * Get count of queued messages by status
   */
  async getQueueCount(status?: QueueStatus): Promise<number> {
    if (status) {
      return await messagingDb.messaging_queued_messages
        .where('status')
        .equals(status)
        .count();
    }
    return await messagingDb.messaging_queued_messages
      .where('synced')
      .equals(0)
      .count();
  }

  /**
   * Sync the message queue
   */
  async syncQueue(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;

    try {
      const supabase = createClient();
      const msgClient = createMessagingClient(supabase);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new AuthenticationError('You must be signed in to sync messages');
      }

      const queue = await this.getQueue();

      if (queue.length === 0) {
        return { success: 0, failed: 0 };
      }

      logger.info('Starting message sync', { count: queue.length });

      let successCount = 0;
      let failedCount = 0;

      for (const queuedMsg of queue) {
        try {
          if (queuedMsg.retries >= OFFLINE_QUEUE_CONFIG.MAX_RETRIES) {
            await this.markAsFailed(queuedMsg.id);
            failedCount++;
            continue;
          }

          await messagingDb.messaging_queued_messages.update(queuedMsg.id, {
            status: 'processing' as QueueStatus,
          });

          if (queuedMsg.retries > 0) {
            const delay = this.getRetryDelay(queuedMsg.retries);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          const { data: lastMessage } = await msgClient
            .from('messages')
            .select('sequence_number')
            .eq('conversation_id', queuedMsg.conversation_id)
            .order('sequence_number', { ascending: false })
            .limit(1)
            .single();

          const nextSequenceNumber = lastMessage
            ? lastMessage.sequence_number + 1
            : 1;

          const { error: insertError } = await msgClient
            .from('messages')
            .insert({
              conversation_id: queuedMsg.conversation_id,
              sender_id: queuedMsg.sender_id,
              encrypted_content: queuedMsg.encrypted_content,
              initialization_vector: queuedMsg.initialization_vector,
              sequence_number: nextSequenceNumber,
              deleted: false,
              edited: false,
              delivered_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            throw new ConnectionError(
              'Failed to insert message: ' + insertError.message
            );
          }

          await msgClient
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', queuedMsg.conversation_id);

          await messagingDb.messaging_queued_messages.update(queuedMsg.id, {
            status: 'sent' as QueueStatus,
            synced: true,
            sequence_number: nextSequenceNumber,
          });

          successCount++;
          logger.debug('Message synced', { id: queuedMsg.id });
        } catch (error) {
          await this.recordFailedAttempt(queuedMsg.id);
          failedCount++;
        }
      }

      logger.info('Message sync complete', {
        success: successCount,
        failed: failedCount,
      });
      return { success: successCount, failed: failedCount };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Remove a message from the queue
   */
  async removeFromQueue(id: string): Promise<void> {
    await messagingDb.messaging_queued_messages.delete(id);
  }

  /**
   * Clear all synced messages
   */
  async clearSyncedMessages(): Promise<number> {
    return await messagingDb.messaging_queued_messages
      .where('synced')
      .equals(1)
      .delete();
  }

  /**
   * Clear entire queue
   */
  async clearQueue(): Promise<void> {
    await messagingDb.messaging_queued_messages.clear();
  }

  /**
   * Get retry delay (exponential backoff)
   */
  getRetryDelay(retryCount: number): number {
    const { INITIAL_DELAY_MS, BACKOFF_MULTIPLIER } = OFFLINE_QUEUE_CONFIG;
    return INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount - 1);
  }

  private async recordFailedAttempt(id: string): Promise<void> {
    const message = await messagingDb.messaging_queued_messages.get(id);
    if (!message) return;

    const newRetries = message.retries + 1;

    if (newRetries >= OFFLINE_QUEUE_CONFIG.MAX_RETRIES) {
      await this.markAsFailed(id);
    } else {
      await messagingDb.messaging_queued_messages.update(id, {
        retries: newRetries,
        status: 'pending' as QueueStatus,
      });
    }
  }

  private async markAsFailed(id: string): Promise<void> {
    await messagingDb.messaging_queued_messages.update(id, {
      status: 'failed' as QueueStatus,
    });
    logger.warn('Message marked as failed', { id });
  }

  /**
   * Retry all failed messages
   */
  async retryFailed(): Promise<number> {
    const failedMessages = await messagingDb.messaging_queued_messages
      .where('status')
      .equals('failed' as QueueStatus)
      .toArray();

    for (const msg of failedMessages) {
      await messagingDb.messaging_queued_messages.update(msg.id, {
        status: 'pending' as QueueStatus,
        retries: 0,
      });
    }

    return failedMessages.length;
  }

  /**
   * Get all failed messages
   */
  async getFailedMessages(): Promise<QueuedMessage[]> {
    return await messagingDb.messaging_queued_messages
      .where('status')
      .equals('failed' as QueueStatus)
      .toArray();
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

// Export singleton instance
export const messageQueue = new MessageQueueAdapter();

// Backwards compatibility alias
export const offlineQueueService = messageQueue;
