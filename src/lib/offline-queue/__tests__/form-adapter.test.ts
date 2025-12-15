/**
 * Unit Tests for FormQueueAdapter
 * Feature 050 - Code Consolidation
 *
 * Tests form submission queue functionality:
 * - Queue form submissions
 * - Process with submit handler
 * - Backwards compatibility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FormQueueAdapter,
  formQueue,
  addToQueue,
  getQueuedItems,
  removeFromQueue,
  clearQueue,
  getQueueSize,
  updateRetryCount,
} from '../form-adapter';

describe('FormQueueAdapter', () => {
  let queue: FormQueueAdapter;

  beforeEach(async () => {
    queue = new FormQueueAdapter();
    await queue.clear();
  });

  afterEach(async () => {
    await queue.clear();
    queue.close();
  });

  describe('queueSubmission()', () => {
    it('should queue form data', async () => {
      const formData = { name: 'John', email: 'john@example.com' };

      const item = await queue.queueSubmission(formData);

      expect(item.id).toBeDefined();
      expect(item.formData).toEqual(formData);
      expect(item.status).toBe('pending');
    });
  });

  describe('setSubmitHandler() and sync()', () => {
    it('should process items with submit handler', async () => {
      const submitted: Record<string, unknown>[] = [];
      queue.setSubmitHandler(async (data) => {
        submitted.push(data);
      });

      await queue.queueSubmission({ name: 'Test' });
      await queue.sync();

      expect(submitted).toHaveLength(1);
      expect(submitted[0]).toEqual({ name: 'Test' });
    });

    it('should throw error if no submit handler configured', async () => {
      await queue.queueSubmission({ name: 'Test' });

      const result = await queue.sync();

      // Should fail because no handler
      expect(result.failed).toBe(1);
    });
  });
});

describe('Backwards Compatibility Functions', () => {
  beforeEach(async () => {
    await clearQueue();
  });

  afterEach(async () => {
    await clearQueue();
  });

  describe('addToQueue()', () => {
    it('should return true on success', async () => {
      const result = await addToQueue({ name: 'Test' });
      expect(result).toBe(true);
    });

    it('should add item to queue', async () => {
      await addToQueue({ name: 'Test' });
      const size = await getQueueSize();
      expect(size).toBe(1);
    });
  });

  describe('getQueuedItems()', () => {
    it('should return all queued items', async () => {
      await addToQueue({ name: 'One' });
      await addToQueue({ name: 'Two' });

      const items = await getQueuedItems();

      expect(items).toHaveLength(2);
    });
  });

  describe('removeFromQueue()', () => {
    it('should return true on success', async () => {
      await addToQueue({ name: 'Test' });
      const items = await getQueuedItems();

      const result = await removeFromQueue(items[0].id!);

      expect(result).toBe(true);
    });
  });

  describe('clearQueue()', () => {
    it('should return true on success', async () => {
      await addToQueue({ name: 'Test' });

      const result = await clearQueue();

      expect(result).toBe(true);
      const size = await getQueueSize();
      expect(size).toBe(0);
    });
  });

  describe('getQueueSize()', () => {
    it('should return correct count', async () => {
      await addToQueue({ name: 'One' });
      await addToQueue({ name: 'Two' });

      const size = await getQueueSize();

      expect(size).toBe(2);
    });
  });

  describe('updateRetryCount()', () => {
    it('should update retry count for item', async () => {
      await addToQueue({ name: 'Test' });
      const items = await getQueuedItems();

      const result = await updateRetryCount(items[0].id!, 3);

      expect(result).toBe(true);
    });

    it('should return false for non-existent item', async () => {
      const result = await updateRetryCount(99999, 1);
      expect(result).toBe(false);
    });
  });
});

describe('formQueue singleton', () => {
  it('should be an instance of FormQueueAdapter', () => {
    expect(formQueue).toBeInstanceOf(FormQueueAdapter);
  });
});
