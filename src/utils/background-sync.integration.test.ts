/**
 * Background sync against a real (fake-indexeddb) database.
 *
 * The contact form queues through @/lib/offline-queue (Dexie), and background
 * sync used to read through the deprecated src/utils/offline-queue.ts. Both
 * open the same IndexedDB name with different schemas, so these tests use the
 * real queue on both sides and a database seeded the way the OLD module wrote
 * it (#89).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSubmitWithRetry } = vi.hoisted(() => ({
  mockSubmitWithRetry: vi.fn(),
}));

vi.mock('./web3forms', () => ({
  submitWithRetry: mockSubmitWithRetry,
}));

const DB_NAME = 'OfflineFormSubmissions';

function deleteDb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

/** Write rows exactly as src/utils/offline-queue.ts did: version 1, bare store. */
function seedLegacyDb(rows: Record<string, unknown>[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('submissions', {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(['submissions'], 'readwrite');
      rows.forEach((row) => tx.objectStore('submissions').add(row));
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

const form = { name: 'Ada', email: 'ada@example.com', message: 'Hello' };

describe('background sync with the real queue (#89)', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockSubmitWithRetry.mockReset();
    await deleteDb();
  });

  it('sends and removes an item the contact form queued', async () => {
    mockSubmitWithRetry.mockResolvedValue({ success: true });
    const queue = await import('@/lib/offline-queue');
    const { processQueue } = await import('./background-sync');

    await queue.addToQueue(form);
    expect(await queue.getQueueSize()).toBe(1);

    await processQueue();

    expect(mockSubmitWithRetry).toHaveBeenCalledTimes(1);
    expect(mockSubmitWithRetry.mock.calls[0][0]).toEqual(form);
    expect(await queue.getQueueSize()).toBe(0);
  });

  it('sends and removes an item written by the old module', async () => {
    mockSubmitWithRetry.mockResolvedValue({ success: true });
    await seedLegacyDb([
      { data: form, timestamp: 1_700_000_000_000, retryCount: 0 },
    ]);
    const queue = await import('@/lib/offline-queue');
    const { processQueue } = await import('./background-sync');

    expect(await queue.getQueueSize()).toBe(1);

    await processQueue();

    expect(mockSubmitWithRetry).toHaveBeenCalledTimes(1);
    expect(mockSubmitWithRetry.mock.calls[0][0]).toEqual(form);
    expect(await queue.getQueueSize()).toBe(0);
  });

  it('counts a failed send as one retry and keeps the item', async () => {
    mockSubmitWithRetry.mockResolvedValue({
      success: false,
      message: 'server down',
    });
    const queue = await import('@/lib/offline-queue');
    const { processQueue } = await import('./background-sync');

    await queue.addToQueue(form);
    await processQueue();

    const [item] = await queue.getQueuedItems();
    expect(item.retries).toBe(1);
    expect(await queue.getQueueSize()).toBe(1);
  });
});
