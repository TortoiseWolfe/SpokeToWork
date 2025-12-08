/**
 * Tests for background-sync.ts
 * Covers Service Worker background sync functionality for offline form submissions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available when vi.mock is hoisted
const {
  mockLogger,
  mockSubmitWithRetry,
  mockGetQueuedItems,
  mockRemoveFromQueue,
  mockUpdateRetryCount,
} = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockSubmitWithRetry: vi.fn(),
  mockGetQueuedItems: vi.fn(),
  mockRemoveFromQueue: vi.fn(),
  mockUpdateRetryCount: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

vi.mock('./web3forms', () => ({
  submitWithRetry: mockSubmitWithRetry,
}));

vi.mock('./offline-queue', () => ({
  getQueuedItems: mockGetQueuedItems,
  removeFromQueue: mockRemoveFromQueue,
  updateRetryCount: mockUpdateRetryCount,
}));

// Import after mocks
import {
  registerBackgroundSync,
  processQueue,
  isBackgroundSyncSupported,
  getSyncStatus,
} from './background-sync';

describe('background-sync', () => {
  // Store original values
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  // Mock sync manager
  const mockSyncRegister = vi.fn();
  const mockSyncGetTags = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockGetQueuedItems.mockResolvedValue([]);
    mockRemoveFromQueue.mockResolvedValue(undefined);
    mockUpdateRetryCount.mockResolvedValue(undefined);
    mockSubmitWithRetry.mockResolvedValue({ success: true });
    mockSyncRegister.mockResolvedValue(undefined);
    mockSyncGetTags.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore navigator and window
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      configurable: true,
    });
  });

  // Helper to set up Service Worker mock
  function setupServiceWorkerMock(
    options: { hasServiceWorker?: boolean; hasSyncManager?: boolean } = {}
  ) {
    const { hasServiceWorker = true, hasSyncManager = true } = options;

    if (hasServiceWorker) {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            ready: Promise.resolve({
              sync: {
                register: mockSyncRegister,
                getTags: mockSyncGetTags,
              },
            }),
          },
        },
        configurable: true,
      });
    } else {
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
      });
    }

    if (hasSyncManager) {
      Object.defineProperty(global, 'window', {
        value: { SyncManager: class {} },
        configurable: true,
      });
    } else {
      Object.defineProperty(global, 'window', {
        value: {},
        configurable: true,
      });
    }
  }

  // =========================================================================
  // isBackgroundSyncSupported() Tests
  // =========================================================================

  describe('isBackgroundSyncSupported()', () => {
    it('returns true when Service Worker and SyncManager are available', () => {
      setupServiceWorkerMock();

      expect(isBackgroundSyncSupported()).toBe(true);
    });

    it('returns false when Service Worker is not available', () => {
      setupServiceWorkerMock({ hasServiceWorker: false, hasSyncManager: true });

      expect(isBackgroundSyncSupported()).toBe(false);
    });

    it('returns false when SyncManager is not available', () => {
      setupServiceWorkerMock({ hasServiceWorker: true, hasSyncManager: false });

      expect(isBackgroundSyncSupported()).toBe(false);
    });

    it('returns false when neither is available', () => {
      setupServiceWorkerMock({
        hasServiceWorker: false,
        hasSyncManager: false,
      });

      expect(isBackgroundSyncSupported()).toBe(false);
    });
  });

  // =========================================================================
  // registerBackgroundSync() Tests
  // =========================================================================

  describe('registerBackgroundSync()', () => {
    it('returns false when APIs are not supported', async () => {
      setupServiceWorkerMock({
        hasServiceWorker: false,
        hasSyncManager: false,
      });

      const result = await registerBackgroundSync();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Not supported in this browser'
      );
    });

    it('registers sync successfully', async () => {
      setupServiceWorkerMock();

      const result = await registerBackgroundSync();

      expect(result).toBe(true);
      expect(mockSyncRegister).toHaveBeenCalledWith('form-submission-sync');
      expect(mockLogger.info).toHaveBeenCalledWith('Registered successfully');
    });

    it('returns false and logs error on registration failure', async () => {
      setupServiceWorkerMock();
      mockSyncRegister.mockRejectedValue(new Error('Registration failed'));

      const result = await registerBackgroundSync();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Registration failed', {
        error: expect.any(Error),
      });
    });
  });

  // =========================================================================
  // processQueue() Tests
  // =========================================================================

  describe('processQueue()', () => {
    it('returns early when queue is empty', async () => {
      setupServiceWorkerMock();
      mockGetQueuedItems.mockResolvedValue([]);

      await processQueue();

      expect(mockLogger.debug).toHaveBeenCalledWith('Processing queue...');
      expect(mockLogger.debug).toHaveBeenCalledWith('Found items in queue', {
        count: 0,
      });
      expect(mockSubmitWithRetry).not.toHaveBeenCalled();
    });

    it('processes queued items successfully', async () => {
      setupServiceWorkerMock();
      const queuedItem = {
        id: '123',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 0,
        lastAttempt: null,
      };
      mockGetQueuedItems
        .mockResolvedValueOnce([queuedItem])
        .mockResolvedValueOnce([]); // Second call for checking remaining items
      mockSubmitWithRetry.mockResolvedValue({ success: true });

      await processQueue();

      expect(mockSubmitWithRetry).toHaveBeenCalledWith(queuedItem.data, 0);
      expect(mockRemoveFromQueue).toHaveBeenCalledWith('123');
      expect(mockLogger.info).toHaveBeenCalledWith('Submission successful', {
        submissionId: '123',
      });
    }, 10000); // Increase timeout for async processing

    it('updates retry count on submission failure', async () => {
      setupServiceWorkerMock();
      const queuedItem = {
        id: '456',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 0,
        lastAttempt: null,
      };
      mockGetQueuedItems
        .mockResolvedValueOnce([queuedItem])
        .mockResolvedValueOnce([queuedItem]); // Still has items after failure
      mockSubmitWithRetry.mockResolvedValue({
        success: false,
        message: 'Server error',
      });

      await processQueue();

      expect(mockUpdateRetryCount).toHaveBeenCalledWith('456', 1);
      expect(mockRemoveFromQueue).not.toHaveBeenCalled();
    }, 10000);

    it('removes item from queue after max retries', async () => {
      setupServiceWorkerMock();
      const queuedItem = {
        id: '789',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 2, // Already at 2, next will be 3 (max)
        lastAttempt: null,
      };
      mockGetQueuedItems
        .mockResolvedValueOnce([queuedItem])
        .mockResolvedValueOnce([]); // Queue empty after removal
      mockSubmitWithRetry.mockRejectedValue(new Error('Network error'));

      await processQueue();

      expect(mockRemoveFromQueue).toHaveBeenCalledWith('789');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Max retries reached, removing from queue',
        { submissionId: '789' }
      );
    }, 10000);

    it('skips items that were attempted too recently', async () => {
      setupServiceWorkerMock();
      const now = Date.now();
      const queuedItem = {
        id: '111',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 1, // Required delay = 1000 * 2^1 = 2000ms
        lastAttempt: now - 1000, // Only 1 second ago
      };
      mockGetQueuedItems.mockResolvedValue([queuedItem]);

      await processQueue();

      expect(mockSubmitWithRetry).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Skipping item, not enough time since last attempt',
        { itemId: '111' }
      );
    });

    it('processes items that have waited long enough', async () => {
      setupServiceWorkerMock();
      const now = Date.now();
      const queuedItem = {
        id: '222',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 1, // Required delay = 1000 * 2^1 = 2000ms
        lastAttempt: now - 3000, // 3 seconds ago (> 2 seconds required)
      };
      mockGetQueuedItems
        .mockResolvedValueOnce([queuedItem])
        .mockResolvedValueOnce([]);
      mockSubmitWithRetry.mockResolvedValue({ success: true });

      await processQueue();

      expect(mockSubmitWithRetry).toHaveBeenCalled();
    }, 10000);

    it('registers for another sync if items remain', async () => {
      setupServiceWorkerMock();
      const queuedItem = {
        id: '333',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 0,
        lastAttempt: null,
      };
      mockGetQueuedItems
        .mockResolvedValueOnce([queuedItem])
        .mockResolvedValueOnce([queuedItem]); // Still has items
      mockSubmitWithRetry.mockResolvedValue({
        success: false,
        message: 'Failed',
      });

      await processQueue();

      // Should register for another sync
      expect(mockSyncRegister).toHaveBeenCalledWith('form-submission-sync');
    }, 10000);

    it('handles processing errors gracefully', async () => {
      setupServiceWorkerMock();
      mockGetQueuedItems.mockRejectedValue(new Error('Database error'));

      await processQueue();

      expect(mockLogger.error).toHaveBeenCalledWith('Queue processing error', {
        error: expect.any(Error),
      });
    }, 10000);

    it('processes multiple items sequentially', async () => {
      setupServiceWorkerMock();
      const items = [
        {
          id: '1',
          data: { name: 'Test1', email: 'test1@example.com', message: 'Hello' },
          retryCount: 0,
          lastAttempt: null,
        },
        {
          id: '2',
          data: { name: 'Test2', email: 'test2@example.com', message: 'Hello' },
          retryCount: 0,
          lastAttempt: null,
        },
      ];
      mockGetQueuedItems.mockResolvedValueOnce(items).mockResolvedValueOnce([]);
      mockSubmitWithRetry.mockResolvedValue({ success: true });

      await processQueue();

      expect(mockSubmitWithRetry).toHaveBeenCalledTimes(2);
      expect(mockRemoveFromQueue).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  // =========================================================================
  // getSyncStatus() Tests
  // =========================================================================

  describe('getSyncStatus()', () => {
    it('returns supported=false when APIs unavailable', async () => {
      setupServiceWorkerMock({
        hasServiceWorker: false,
        hasSyncManager: false,
      });
      mockGetQueuedItems.mockResolvedValue([]);

      const status = await getSyncStatus();

      expect(status).toEqual({
        supported: false,
        registered: false,
        queueSize: 0,
      });
    });

    it('returns registered=true when sync tag exists', async () => {
      setupServiceWorkerMock();
      mockSyncGetTags.mockResolvedValue(['form-submission-sync']);
      mockGetQueuedItems.mockResolvedValue([]);

      const status = await getSyncStatus();

      expect(status.supported).toBe(true);
      expect(status.registered).toBe(true);
    });

    it('returns registered=false when sync tag does not exist', async () => {
      setupServiceWorkerMock();
      mockSyncGetTags.mockResolvedValue(['other-sync']);
      mockGetQueuedItems.mockResolvedValue([]);

      const status = await getSyncStatus();

      expect(status.supported).toBe(true);
      expect(status.registered).toBe(false);
    });

    it('returns correct queue size', async () => {
      setupServiceWorkerMock();
      mockSyncGetTags.mockResolvedValue([]);
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
      mockGetQueuedItems.mockResolvedValue(items);

      const status = await getSyncStatus();

      expect(status.queueSize).toBe(3);
    });

    it('handles errors when getting sync tags', async () => {
      setupServiceWorkerMock();
      mockSyncGetTags.mockRejectedValue(new Error('Permission denied'));
      mockGetQueuedItems.mockResolvedValue([]);

      const status = await getSyncStatus();

      expect(status.registered).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting sync tags', {
        error: expect.any(Error),
      });
    });

    it('handles errors when getting queue size', async () => {
      setupServiceWorkerMock();
      mockSyncGetTags.mockResolvedValue([]);
      mockGetQueuedItems.mockRejectedValue(new Error('IndexedDB error'));

      const status = await getSyncStatus();

      expect(status.queueSize).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting queue size',
        {
          error: expect.any(Error),
        }
      );
    });
  });

  // =========================================================================
  // Exponential Backoff Tests
  // =========================================================================

  describe('Exponential backoff', () => {
    it('requires 1 second delay for first retry (retryCount=0)', async () => {
      setupServiceWorkerMock();
      const now = Date.now();
      const queuedItem = {
        id: '444',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 0,
        lastAttempt: now - 500, // Only 500ms ago (< 1000ms required)
      };
      mockGetQueuedItems.mockResolvedValue([queuedItem]);

      await processQueue();

      expect(mockSubmitWithRetry).not.toHaveBeenCalled();
    });

    it('requires 2 seconds delay for second retry (retryCount=1)', async () => {
      setupServiceWorkerMock();
      const now = Date.now();
      const queuedItem = {
        id: '555',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 1,
        lastAttempt: now - 1500, // 1.5 seconds (< 2 seconds required)
      };
      mockGetQueuedItems.mockResolvedValue([queuedItem]);

      await processQueue();

      expect(mockSubmitWithRetry).not.toHaveBeenCalled();
    });

    it('requires 4 seconds delay for third retry (retryCount=2)', async () => {
      setupServiceWorkerMock();
      const now = Date.now();
      const queuedItem = {
        id: '666',
        data: { name: 'Test', email: 'test@example.com', message: 'Hello' },
        retryCount: 2,
        lastAttempt: now - 3000, // 3 seconds (< 4 seconds required)
      };
      mockGetQueuedItems.mockResolvedValue([queuedItem]);

      await processQueue();

      expect(mockSubmitWithRetry).not.toHaveBeenCalled();
    });
  });
});
