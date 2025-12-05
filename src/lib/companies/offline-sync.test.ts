/**
 * Offline Sync Service Tests - Feature 011
 *
 * Uses fake-indexeddb for mocking IndexedDB in tests.
 * @see specs/011-company-management/contracts/offline-sync.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { OfflineSyncService } from './offline-sync';
import type { Company, OfflineCompany, CompanyFilters } from '@/types/company';

// Mock company data
const mockCompany: Company = {
  id: 'test-company-1',
  user_id: 'test-user-1',
  name: 'Test Company',
  contact_name: 'John Doe',
  contact_title: 'Manager',
  phone: '555-1234',
  email: 'john@test.com',
  website: 'https://test.com',
  address: '123 Main St, Test City, TC 12345',
  latitude: 40.7128,
  longitude: -74.006,
  extended_range: false,
  status: 'not_contacted',
  priority: 3,
  notes: 'Test notes',
  follow_up_date: null,
  route_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;

  beforeEach(async () => {
    // Completely reset fake-indexeddb by creating new instance
    // This ensures no state leaks between tests
    const newIndexedDB = new IDBFactory();
    globalThis.indexedDB = newIndexedDB;

    // Create fresh service for each test
    service = new OfflineSyncService();
    await service.initialize();
  });

  afterEach(async () => {
    // Clean up - reset indexedDB again
    const newIndexedDB = new IDBFactory();
    globalThis.indexedDB = newIndexedDB;
  });

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      const newService = new OfflineSyncService();
      await expect(newService.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initialize calls', async () => {
      await service.initialize();
      await service.initialize();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine status', () => {
      const result = service.isOnline();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('local company operations', () => {
    it('should save a company locally', async () => {
      await service.saveLocal(mockCompany);
      const saved = await service.getLocal(mockCompany.id);

      expect(saved).toBeTruthy();
      expect(saved?.name).toBe(mockCompany.name);
    });

    it('should save with synced_at when synced=true', async () => {
      await service.saveLocal(mockCompany, true);
      const saved = await service.getLocal(mockCompany.id);

      expect(saved?.synced_at).toBeTruthy();
      expect(saved?.server_version).toBe(1);
    });

    it('should save with synced_at=null when synced=false', async () => {
      await service.saveLocal(mockCompany, false);
      const saved = await service.getLocal(mockCompany.id);

      expect(saved?.synced_at).toBeNull();
      expect(saved?.server_version).toBe(0);
    });

    it('should return null for non-existent company', async () => {
      const result = await service.getLocal('non-existent-id');
      expect(result).toBeNull();
    });

    it('should get all companies', async () => {
      await service.saveLocal(mockCompany);
      await service.saveLocal({
        ...mockCompany,
        id: 'test-company-2',
        name: 'Second',
      });

      const companies = await service.getAllLocal();

      expect(companies).toHaveLength(2);
    });

    it('should delete a company', async () => {
      await service.saveLocal(mockCompany);
      await service.deleteLocal(mockCompany.id);

      const result = await service.getLocal(mockCompany.id);
      expect(result).toBeNull();
    });

    it('should update local version on update', async () => {
      await service.saveLocal(mockCompany);
      const saved = (await service.getLocal(mockCompany.id)) as OfflineCompany;

      await service.updateLocal({ ...saved, name: 'Updated Name' });
      const updated = await service.getLocal(mockCompany.id);

      expect(updated?.local_version).toBe(2);
      expect(updated?.synced_at).toBeNull();
    });
  });

  describe('filtering', () => {
    beforeEach(async () => {
      // Add multiple companies with different attributes
      await service.saveLocal({
        ...mockCompany,
        id: '1',
        status: 'not_contacted',
        priority: 1,
        is_active: true,
      });
      await service.saveLocal({
        ...mockCompany,
        id: '2',
        status: 'contacted',
        priority: 2,
        is_active: true,
      });
      await service.saveLocal({
        ...mockCompany,
        id: '3',
        status: 'contacted',
        priority: 3,
        is_active: false,
      });
    });

    it('should filter by status', async () => {
      const filters: CompanyFilters = { status: 'contacted' };
      const result = await service.getAllLocal(filters);

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.status === 'contacted')).toBe(true);
    });

    it('should filter by multiple statuses', async () => {
      const filters: CompanyFilters = {
        status: ['not_contacted', 'contacted'],
      };
      const result = await service.getAllLocal(filters);

      expect(result).toHaveLength(3);
    });

    it('should filter by priority', async () => {
      const filters: CompanyFilters = { priority: 1 };
      const result = await service.getAllLocal(filters);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe(1);
    });

    it('should filter by is_active', async () => {
      const filters: CompanyFilters = { is_active: true };
      const result = await service.getAllLocal(filters);

      expect(result).toHaveLength(2);
    });

    it('should filter by search term in name', async () => {
      await service.saveLocal({
        ...mockCompany,
        id: '4',
        name: 'Unique Search Term Company',
      });

      const filters: CompanyFilters = { search: 'unique search' };
      const result = await service.getAllLocal(filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });

    it('should filter by search term in contact_name', async () => {
      await service.saveLocal({
        ...mockCompany,
        id: '5',
        contact_name: 'Special Contact Person',
      });

      const filters: CompanyFilters = { search: 'special contact' };
      const result = await service.getAllLocal(filters);

      expect(result).toHaveLength(1);
    });

    it('should combine filters with AND logic', async () => {
      const filters: CompanyFilters = { status: 'contacted', is_active: true };
      const result = await service.getAllLocal(filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('sync queue operations', () => {
    it('should queue a create change', async () => {
      await service.queueChange('create', 'new-company-id', {
        name: 'New Company',
        address: '123 Test St',
        latitude: 40,
        longitude: -74,
      });

      const queued = await service.getQueuedChanges();

      expect(queued).toHaveLength(1);
      expect(queued[0].action).toBe('create');
    });

    it('should queue an update change', async () => {
      await service.queueChange('update', mockCompany.id, {
        id: mockCompany.id,
        name: 'Updated Name',
      });

      const queued = await service.getQueuedChanges();

      expect(queued).toHaveLength(1);
      expect(queued[0].action).toBe('update');
    });

    it('should queue a delete change', async () => {
      await service.queueChange('delete', mockCompany.id, null);

      const queued = await service.getQueuedChanges();

      expect(queued).toHaveLength(1);
      expect(queued[0].action).toBe('delete');
      expect(queued[0].payload).toBeNull();
    });

    it('should clear a queue item', async () => {
      await service.queueChange('create', 'company-1', null);
      const queued = await service.getQueuedChanges();

      await service.clearQueueItem(queued[0].id);
      const remaining = await service.getQueuedChanges();

      expect(remaining).toHaveLength(0);
    });

    it('should clear all queue items for a company', async () => {
      await service.queueChange('create', 'company-1', null);
      await service.queueChange('update', 'company-1', null);
      await service.queueChange('create', 'company-2', null);

      await service.clearQueueForCompany('company-1');
      const remaining = await service.getQueuedChanges();

      expect(remaining).toHaveLength(1);
      expect(remaining[0].company_id).toBe('company-2');
    });

    it('should count pending changes', async () => {
      await service.queueChange('create', 'company-1', null);
      await service.queueChange('update', 'company-2', null);

      const count = await service.getPendingCount();

      expect(count).toBe(2);
    });
  });

  describe('conflict management', () => {
    const localVersion: OfflineCompany = {
      ...mockCompany,
      name: 'Local Name',
      synced_at: null,
      local_version: 2,
      server_version: 1,
    };

    const serverVersion: Company = {
      ...mockCompany,
      name: 'Server Name',
    };

    it('should store a conflict', async () => {
      await service.storeConflict(mockCompany.id, localVersion, serverVersion);

      const conflicts = await service.getConflicts();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].company_id).toBe(mockCompany.id);
    });

    it('should resolve conflict with local version', async () => {
      await service.saveLocal(localVersion);
      await service.storeConflict(mockCompany.id, localVersion, serverVersion);

      await service.resolveConflict(mockCompany.id, 'local');

      const conflicts = await service.getConflicts();
      expect(conflicts).toHaveLength(0);

      // Local version should remain
      const saved = await service.getLocal(mockCompany.id);
      expect(saved?.name).toBe('Local Name');
    });

    it('should resolve conflict with server version', async () => {
      await service.saveLocal(localVersion);
      await service.storeConflict(mockCompany.id, localVersion, serverVersion);

      await service.resolveConflict(mockCompany.id, 'server');

      const conflicts = await service.getConflicts();
      expect(conflicts).toHaveLength(0);

      // Server version should be saved
      const saved = await service.getLocal(mockCompany.id);
      expect(saved?.name).toBe('Server Name');
    });

    it('should throw when resolving non-existent conflict', async () => {
      await expect(
        service.resolveConflict('non-existent', 'local')
      ).rejects.toThrow('Conflict not found');
    });
  });

  describe('sync summary', () => {
    it('should return correct sync summary', async () => {
      await service.saveLocal(mockCompany, true);
      await service.queueChange('update', mockCompany.id, null);

      const summary = await service.getSyncSummary();

      expect(summary.pending).toBe(1);
      expect(summary.conflicts).toBe(0);
      expect(summary.lastSync).toBeTruthy();
    });

    it('should return null lastSync when no companies synced', async () => {
      await service.saveLocal(mockCompany, false);

      const summary = await service.getSyncSummary();

      expect(summary.lastSync).toBeNull();
    });
  });

  describe('geocode cache', () => {
    const mockCache = {
      address_key: '123 main st',
      result: {
        success: true,
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
      },
      timestamp: Date.now(),
    };

    it('should cache geocode result', async () => {
      await service.cacheGeocode(mockCache);

      const cached = await service.getCachedGeocode('123 main st');

      expect(cached).toBeTruthy();
      expect(cached?.result.latitude).toBe(40.7128);
    });

    it('should return null for non-cached address', async () => {
      const cached = await service.getCachedGeocode('non-existent');

      expect(cached).toBeNull();
    });

    it('should clean old cache entries', async () => {
      // Add old cache entry
      await service.cacheGeocode({
        ...mockCache,
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 8, // 8 days ago
      });

      await service.cleanGeocodeCache(1000 * 60 * 60 * 24 * 7); // 7 day max age

      const cached = await service.getCachedGeocode('123 main st');
      expect(cached).toBeNull();
    });
  });
});
