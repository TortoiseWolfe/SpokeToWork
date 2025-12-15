/**
 * Form Queue Adapter
 *
 * Feature 050 - Code Consolidation
 * Handles offline queuing for form submissions.
 *
 * Replaces: src/utils/offline-queue.ts
 *
 * @module lib/offline-queue/form-adapter
 */

import { BaseOfflineQueue } from './base-queue';
import { FormQueueItem, DEFAULT_QUEUE_CONFIG } from './types';

/**
 * Form queue for offline form submissions
 *
 * @example
 * ```typescript
 * // Queue a form submission
 * await formQueue.queueSubmission({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   message: 'Hello world',
 * });
 *
 * // Process queue when back online
 * const result = await formQueue.sync();
 * ```
 */
export class FormQueueAdapter extends BaseOfflineQueue<FormQueueItem> {
  /** Submission handler function */
  private submitHandler?: (data: Record<string, unknown>) => Promise<void>;

  constructor() {
    super({
      dbName: 'OfflineFormSubmissions',
      tableName: 'submissions',
      ...DEFAULT_QUEUE_CONFIG,
    });
  }

  /**
   * Set the submission handler for processing queued forms
   *
   * @param handler - Async function that submits form data to server
   */
  setSubmitHandler(
    handler: (data: Record<string, unknown>) => Promise<void>
  ): void {
    this.submitHandler = handler;
  }

  /**
   * Queue a form submission
   */
  async queueSubmission(
    formData: Record<string, unknown>
  ): Promise<FormQueueItem> {
    return await this.queue({
      formData,
    } as Omit<FormQueueItem, 'id' | 'status' | 'retries' | 'createdAt'>);
  }

  /**
   * Process a single form queue item
   */
  protected async processItem(item: FormQueueItem): Promise<void> {
    if (!this.submitHandler) {
      throw new Error(
        'No submit handler configured. Call setSubmitHandler() first.'
      );
    }

    await this.submitHandler(item.formData);
  }
}

// Export singleton instance
export const formQueue = new FormQueueAdapter();

// Re-export functions for backwards compatibility during migration
// These maintain the same return types as the original src/utils/offline-queue.ts

/**
 * Add form submission to offline queue
 * @returns true on success, false on failure (backwards compatible)
 */
export const addToQueue = async (
  data: Record<string, unknown>
): Promise<boolean> => {
  try {
    await formQueue.queueSubmission(data);
    return true;
  } catch {
    return false;
  }
};

export const getQueuedItems = async (): Promise<FormQueueItem[]> => {
  return await formQueue.getQueue();
};

export const removeFromQueue = async (id: number): Promise<boolean> => {
  try {
    await formQueue.remove(id);
    return true;
  } catch {
    return false;
  }
};

export const clearQueue = async (): Promise<boolean> => {
  try {
    await formQueue.clear();
    return true;
  } catch {
    return false;
  }
};

export const getQueueSize = async (): Promise<number> => {
  return await formQueue.getCount();
};

/**
 * Update retry count for a submission (backwards compatible)
 * Note: The new queue handles retries internally via sync(),
 * but this function is provided for backwards compatibility.
 */
export const updateRetryCount = async (
  id: number,
  retryCount: number
): Promise<boolean> => {
  try {
    const item = await formQueue.get(id);
    if (!item) return false;

    await (formQueue as any).items.update(id, {
      retries: retryCount,
      lastAttempt: Date.now(),
    } as any);
    return true;
  } catch {
    return false;
  }
};
