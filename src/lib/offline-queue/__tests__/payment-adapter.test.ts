/**
 * Unit Tests for PaymentQueueAdapter
 * Feature 050 - Code Consolidation
 *
 * Tests payment queue functionality:
 * - Queue payment intents
 * - Queue subscription updates
 * - Backwards compatibility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PaymentQueueAdapter,
  paymentQueue,
  queueOperation,
  processPendingOperations,
  getPendingCount,
  clearQueue,
} from '../payment-adapter';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

describe('PaymentQueueAdapter', () => {
  let queue: PaymentQueueAdapter;

  beforeEach(async () => {
    queue = new PaymentQueueAdapter();
    await queue.clear();
  });

  afterEach(async () => {
    await queue.clear();
    queue.close();
  });

  describe('queuePaymentIntent()', () => {
    it('should queue payment intent data', async () => {
      const intentData = {
        amount: 1000,
        currency: 'usd',
        type: 'one_time',
        customer_email: 'test@example.com',
      };

      const item = await queue.queuePaymentIntent(intentData);

      expect(item.id).toBeDefined();
      expect(item.type).toBe('payment_intent');
      expect(item.data).toEqual(intentData);
      expect(item.status).toBe('pending');
    });
  });

  describe('queueSubscriptionUpdate()', () => {
    it('should queue subscription update', async () => {
      const item = await queue.queueSubscriptionUpdate('sub-123', {
        status: 'active',
      });

      expect(item.id).toBeDefined();
      expect(item.type).toBe('subscription_update');
      expect(item.data).toEqual({ id: 'sub-123', status: 'active' });
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

  describe('queueOperation()', () => {
    it('should queue payment_intent operation', async () => {
      await queueOperation('payment_intent', {
        amount: 500,
        currency: 'usd',
        type: 'one_time',
        customer_email: 'test@example.com',
      });

      const count = await getPendingCount();
      expect(count).toBe(1);
    });

    it('should queue subscription_update operation', async () => {
      await queueOperation('subscription_update', {
        id: 'sub-123',
        status: 'canceled',
      });

      const count = await getPendingCount();
      expect(count).toBe(1);
    });
  });

  describe('getPendingCount()', () => {
    it('should return count of pending items', async () => {
      await queueOperation('payment_intent', { amount: 100 });
      await queueOperation('payment_intent', { amount: 200 });

      const count = await getPendingCount();

      expect(count).toBe(2);
    });

    it('should return 0 when queue is empty', async () => {
      const count = await getPendingCount();
      expect(count).toBe(0);
    });
  });

  describe('clearQueue()', () => {
    it('should clear all items', async () => {
      await queueOperation('payment_intent', { amount: 100 });

      await clearQueue();

      const count = await getPendingCount();
      expect(count).toBe(0);
    });
  });

  describe('processPendingOperations()', () => {
    it('should process queue without throwing', async () => {
      // Just verify it doesn't throw
      await expect(processPendingOperations()).resolves.not.toThrow();
    });
  });
});

describe('paymentQueue singleton', () => {
  it('should be an instance of PaymentQueueAdapter', () => {
    expect(paymentQueue).toBeInstanceOf(PaymentQueueAdapter);
  });
});
