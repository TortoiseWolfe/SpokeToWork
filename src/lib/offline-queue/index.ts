/**
 * Offline Queue Module
 *
 * Feature 050 - Code Consolidation
 * Unified offline queue system with domain-specific adapters.
 *
 * This module consolidates the following implementations:
 * - src/utils/offline-queue.ts (forms)
 * - src/services/messaging/offline-queue-service.ts (messaging)
 * - src/lib/payments/offline-queue.ts (payments)
 * - src/lib/companies/offline-sync.ts (companies)
 *
 * @module lib/offline-queue
 *
 * @example
 * ```typescript
 * // Import specific adapters
 * import { formQueue, paymentQueue, messageQueue, companyQueue } from '@/lib/offline-queue';
 *
 * // Queue operations
 * await formQueue.queueSubmission({ name: 'John', email: 'john@example.com' });
 * await paymentQueue.queuePaymentIntent({ amount: 1000, currency: 'usd', ... });
 * await messageQueue.queueMessage({ id: '...', conversation_id: '...', ... });
 * await companyQueue.queueChange('update', 'company-123', { name: 'New Name' }, { ... });
 *
 * // Sync when online
 * await formQueue.sync();
 * await paymentQueue.sync();
 * await messageQueue.syncQueue();
 * await companyQueue.sync();
 * ```
 */

// Base classes and types
export { BaseOfflineQueue } from './base-queue';
export * from './types';

// Form adapter
export {
  FormQueueAdapter,
  formQueue,
  addToQueue,
  getQueuedItems,
  removeFromQueue,
  clearQueue,
  clearQueue as clearFormQueue,
  getQueueSize,
  updateRetryCount,
} from './form-adapter';

// Payment adapter
export {
  PaymentQueueAdapter,
  paymentQueue,
  queueOperation,
  processPendingOperations,
  getPendingCount,
  clearQueue as clearPaymentQueue,
} from './payment-adapter';

// Message adapter
export {
  MessageQueueAdapter,
  messageQueue,
  offlineQueueService,
} from './message-adapter';

// Company adapter
export { CompanyQueueAdapter, companyQueue } from './company-adapter';
