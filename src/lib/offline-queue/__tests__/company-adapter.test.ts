/**
 * Unit Tests for CompanyQueueAdapter
 * Feature 050 - Code Consolidation
 *
 * Tests company sync queue functionality:
 * - Queue company changes (create, update, delete)
 * - Conflict detection and resolution
 * - Version tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CompanyQueueAdapter, companyQueue } from '../company-adapter';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

describe('CompanyQueueAdapter', () => {
  let queue: CompanyQueueAdapter;

  beforeEach(async () => {
    queue = new CompanyQueueAdapter();
    await queue.clear();
  });

  afterEach(async () => {
    await queue.clear();
    queue.close();
  });

  describe('queueChange()', () => {
    it('should queue create action', async () => {
      const item = await queue.queueChange(
        'create',
        'company-123',
        { name: 'New Company' },
        { localVersion: 1, serverVersion: 0 }
      );

      expect(item.id).toBeDefined();
      expect(item.action).toBe('create');
      expect(item.companyId).toBe('company-123');
      expect(item.payload).toEqual({ name: 'New Company' });
      expect(item.localVersion).toBe(1);
      expect(item.serverVersion).toBe(0);
    });

    it('should queue update action', async () => {
      const item = await queue.queueChange(
        'update',
        'company-456',
        { name: 'Updated Name' },
        { localVersion: 3, serverVersion: 2 }
      );

      expect(item.action).toBe('update');
      expect(item.localVersion).toBe(3);
      expect(item.serverVersion).toBe(2);
    });

    it('should queue delete action with null payload', async () => {
      const item = await queue.queueChange('delete', 'company-789', null, {
        localVersion: 5,
        serverVersion: 5,
      });

      expect(item.action).toBe('delete');
      expect(item.payload).toBeNull();
    });
  });

  describe('getConflicts()', () => {
    it('should return empty array when no conflicts', () => {
      const conflicts = queue.getConflicts();
      expect(conflicts).toEqual([]);
    });
  });

  describe('resolveConflict()', () => {
    it('should throw error when no conflict exists', async () => {
      await expect(
        queue.resolveConflict('non-existent', 'local')
      ).rejects.toThrow('No conflict found');
    });
  });

  describe('sync()', () => {
    it('should process pending items', async () => {
      await queue.queueChange(
        'create',
        'company-new',
        { name: 'Test' },
        { localVersion: 1, serverVersion: 0 }
      );

      const result = await queue.sync();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
    });
  });
});

describe('companyQueue singleton', () => {
  it('should be an instance of CompanyQueueAdapter', () => {
    expect(companyQueue).toBeInstanceOf(CompanyQueueAdapter);
  });
});
