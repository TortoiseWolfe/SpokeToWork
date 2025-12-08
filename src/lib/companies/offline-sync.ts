/**
 * Offline Sync Service - Feature 011
 *
 * Manages IndexedDB storage and synchronization with Supabase
 * for offline-first company management.
 *
 * @see specs/011-company-management/contracts/offline-sync.md
 */

import type {
  Company,
  CompanyCreate,
  CompanyUpdate,
  CompanyFilters,
  OfflineCompany,
  SyncQueueItem,
  SyncConflict,
  GeocodeCache,
  JobApplication,
  JobApplicationCreate,
  JobApplicationUpdate,
  JobApplicationFilters,
  OfflineJobApplication,
  JobApplicationSyncQueueItem,
  JobApplicationSyncConflict,
  // Feature 012 types
  PrivateCompany,
  PrivateCompanyCreate,
  PrivateCompanyUpdate,
  UserCompanyTracking,
  TrackSharedCompanyCreate,
  UserCompanyTrackingUpdate,
  MetroArea,
  SharedCompany,
  UnifiedCompany,
  OfflinePrivateCompany,
  OfflineUserCompanyTracking,
  PrivateCompanySyncQueueItem,
  TrackingSyncQueueItem,
  PrivateCompanySyncConflict,
  TrackingSyncConflict,
  UnifiedCompanyFilters,
} from '@/types/company';

// Database configuration
const DB_NAME = 'spoketowork-companies';
const DB_VERSION = 3; // Incremented for Feature 012 multi-tenant support

// Object store names
const STORES = {
  // Feature 011 stores
  COMPANIES: 'companies',
  SYNC_QUEUE: 'sync_queue',
  CONFLICTS: 'conflicts',
  GEOCODE_CACHE: 'geocode_cache',
  JOB_APPLICATIONS: 'job_applications',
  JOB_APP_SYNC_QUEUE: 'job_app_sync_queue',
  JOB_APP_CONFLICTS: 'job_app_conflicts',
  // Feature 012 stores
  PRIVATE_COMPANIES: 'private_companies',
  PRIVATE_SYNC_QUEUE: 'private_sync_queue',
  PRIVATE_CONFLICTS: 'private_conflicts',
  TRACKING: 'user_company_tracking',
  TRACKING_SYNC_QUEUE: 'tracking_sync_queue',
  TRACKING_CONFLICTS: 'tracking_conflicts',
  METRO_AREAS: 'metro_areas',
  SHARED_COMPANIES: 'shared_companies',
  UNIFIED_CACHE: 'unified_cache',
} as const;

/**
 * Open IndexedDB connection
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Companies store with sync metadata
      if (!db.objectStoreNames.contains(STORES.COMPANIES)) {
        const companiesStore = db.createObjectStore(STORES.COMPANIES, {
          keyPath: 'id',
        });
        companiesStore.createIndex('user_id', 'user_id', { unique: false });
        companiesStore.createIndex('status', 'status', { unique: false });
        companiesStore.createIndex('synced_at', 'synced_at', { unique: false });
        companiesStore.createIndex('updated_at', 'updated_at', {
          unique: false,
        });
      }

      // Sync queue for pending changes
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
        });
        syncStore.createIndex('company_id', 'company_id', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Conflicts awaiting resolution
      if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
        const conflictsStore = db.createObjectStore(STORES.CONFLICTS, {
          keyPath: 'company_id',
        });
        conflictsStore.createIndex('detected_at', 'detected_at', {
          unique: false,
        });
      }

      // Geocode cache
      if (!db.objectStoreNames.contains(STORES.GEOCODE_CACHE)) {
        const cacheStore = db.createObjectStore(STORES.GEOCODE_CACHE, {
          keyPath: 'address_key',
        });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Job applications store with sync metadata (added in v2)
      if (!db.objectStoreNames.contains(STORES.JOB_APPLICATIONS)) {
        const jobAppsStore = db.createObjectStore(STORES.JOB_APPLICATIONS, {
          keyPath: 'id',
        });
        jobAppsStore.createIndex('company_id', 'company_id', { unique: false });
        jobAppsStore.createIndex('user_id', 'user_id', { unique: false });
        jobAppsStore.createIndex('status', 'status', { unique: false });
        jobAppsStore.createIndex('outcome', 'outcome', { unique: false });
        jobAppsStore.createIndex('synced_at', 'synced_at', { unique: false });
        jobAppsStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Job applications sync queue (added in v2)
      if (!db.objectStoreNames.contains(STORES.JOB_APP_SYNC_QUEUE)) {
        const jobAppSyncStore = db.createObjectStore(
          STORES.JOB_APP_SYNC_QUEUE,
          {
            keyPath: 'id',
          }
        );
        jobAppSyncStore.createIndex('application_id', 'application_id', {
          unique: false,
        });
        jobAppSyncStore.createIndex('created_at', 'created_at', {
          unique: false,
        });
      }

      // Job applications conflicts (added in v2)
      if (!db.objectStoreNames.contains(STORES.JOB_APP_CONFLICTS)) {
        const jobAppConflictsStore = db.createObjectStore(
          STORES.JOB_APP_CONFLICTS,
          { keyPath: 'application_id' }
        );
        jobAppConflictsStore.createIndex('detected_at', 'detected_at', {
          unique: false,
        });
      }

      // =========================================================================
      // Feature 012: Multi-tenant stores (added in v3)
      // =========================================================================

      // Private companies store
      if (!db.objectStoreNames.contains(STORES.PRIVATE_COMPANIES)) {
        const privateStore = db.createObjectStore(STORES.PRIVATE_COMPANIES, {
          keyPath: 'id',
        });
        privateStore.createIndex('user_id', 'user_id', { unique: false });
        privateStore.createIndex('metro_area_id', 'metro_area_id', {
          unique: false,
        });
        privateStore.createIndex('status', 'status', { unique: false });
        privateStore.createIndex('synced_at', 'synced_at', { unique: false });
      }

      // Private companies sync queue
      if (!db.objectStoreNames.contains(STORES.PRIVATE_SYNC_QUEUE)) {
        const privateSyncStore = db.createObjectStore(
          STORES.PRIVATE_SYNC_QUEUE,
          { keyPath: 'id' }
        );
        privateSyncStore.createIndex(
          'private_company_id',
          'private_company_id',
          {
            unique: false,
          }
        );
        privateSyncStore.createIndex('created_at', 'created_at', {
          unique: false,
        });
      }

      // Private companies conflicts
      if (!db.objectStoreNames.contains(STORES.PRIVATE_CONFLICTS)) {
        const privateConflictsStore = db.createObjectStore(
          STORES.PRIVATE_CONFLICTS,
          { keyPath: 'private_company_id' }
        );
        privateConflictsStore.createIndex('detected_at', 'detected_at', {
          unique: false,
        });
      }

      // User company tracking store
      if (!db.objectStoreNames.contains(STORES.TRACKING)) {
        const trackingStore = db.createObjectStore(STORES.TRACKING, {
          keyPath: 'id',
        });
        trackingStore.createIndex('user_id', 'user_id', { unique: false });
        trackingStore.createIndex('shared_company_id', 'shared_company_id', {
          unique: false,
        });
        trackingStore.createIndex('synced_at', 'synced_at', { unique: false });
      }

      // Tracking sync queue
      if (!db.objectStoreNames.contains(STORES.TRACKING_SYNC_QUEUE)) {
        const trackingSyncStore = db.createObjectStore(
          STORES.TRACKING_SYNC_QUEUE,
          { keyPath: 'id' }
        );
        trackingSyncStore.createIndex('tracking_id', 'tracking_id', {
          unique: false,
        });
        trackingSyncStore.createIndex('created_at', 'created_at', {
          unique: false,
        });
      }

      // Tracking conflicts
      if (!db.objectStoreNames.contains(STORES.TRACKING_CONFLICTS)) {
        const trackingConflictsStore = db.createObjectStore(
          STORES.TRACKING_CONFLICTS,
          { keyPath: 'tracking_id' }
        );
        trackingConflictsStore.createIndex('detected_at', 'detected_at', {
          unique: false,
        });
      }

      // Metro areas cache (read-only, long TTL)
      if (!db.objectStoreNames.contains(STORES.METRO_AREAS)) {
        const metroStore = db.createObjectStore(STORES.METRO_AREAS, {
          keyPath: 'id',
        });
        metroStore.createIndex('name', 'name', { unique: false });
      }

      // Shared companies cache (read-only)
      if (!db.objectStoreNames.contains(STORES.SHARED_COMPANIES)) {
        const sharedStore = db.createObjectStore(STORES.SHARED_COMPANIES, {
          keyPath: 'id',
        });
        sharedStore.createIndex('metro_area_id', 'metro_area_id', {
          unique: false,
        });
        sharedStore.createIndex('name', 'name', { unique: false });
      }

      // Unified view cache
      if (!db.objectStoreNames.contains(STORES.UNIFIED_CACHE)) {
        const unifiedStore = db.createObjectStore(STORES.UNIFIED_CACHE, {
          keyPath: 'cache_key',
        });
        unifiedStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Generate UUID for local records
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Offline Sync Service class
 */
export class OfflineSyncService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = openDatabase().then((db) => {
      this.db = db;
    });

    return this.initPromise;
  }

  /**
   * Ensure database is ready
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Check if browser is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  // =========================================================================
  // Local Company Operations
  // =========================================================================

  /**
   * Save a company to local storage
   */
  async saveLocal(company: Company, synced: boolean = false): Promise<void> {
    const db = await this.ensureDb();

    const offlineCompany: OfflineCompany = {
      ...company,
      synced_at: synced ? new Date().toISOString() : null,
      local_version: 1,
      server_version: synced ? 1 : 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.COMPANIES], 'readwrite');
      const store = transaction.objectStore(STORES.COMPANIES);
      const request = store.put(offlineCompany);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to save company locally'));
    });
  }

  /**
   * Get a company by ID from local storage
   */
  async getLocal(id: string): Promise<OfflineCompany | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.COMPANIES], 'readonly');
      const store = transaction.objectStore(STORES.COMPANIES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get company'));
    });
  }

  /**
   * Get all companies from local storage with optional filtering
   */
  async getAllLocal(filters?: CompanyFilters): Promise<OfflineCompany[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.COMPANIES], 'readonly');
      const store = transaction.objectStore(STORES.COMPANIES);
      const request = store.getAll();

      request.onsuccess = () => {
        let companies = request.result as OfflineCompany[];

        if (filters) {
          companies = this.applyFilters(companies, filters);
        }

        resolve(companies);
      };
      request.onerror = () => reject(new Error('Failed to get companies'));
    });
  }

  /**
   * Apply filters to company list (client-side filtering)
   */
  private applyFilters(
    companies: OfflineCompany[],
    filters: CompanyFilters
  ): OfflineCompany[] {
    return companies.filter((company) => {
      // Status filter
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        if (!statuses.includes(company.status)) return false;
      }

      // Priority filter
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority)
          ? filters.priority
          : [filters.priority];
        if (!priorities.includes(company.priority)) return false;
      }

      // Route filter
      if (filters.route_id !== undefined) {
        if (company.route_id !== filters.route_id) return false;
      }

      // Active filter
      if (filters.is_active !== undefined) {
        if (company.is_active !== filters.is_active) return false;
      }

      // Extended range filter
      if (filters.extended_range !== undefined) {
        if (company.extended_range !== filters.extended_range) return false;
      }

      // Search filter (case-insensitive substring matching)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = company.name.toLowerCase().includes(searchLower);
        const matchesContact =
          company.contact_name?.toLowerCase().includes(searchLower) ?? false;
        const matchesNotes =
          company.notes?.toLowerCase().includes(searchLower) ?? false;

        if (!matchesName && !matchesContact && !matchesNotes) return false;
      }

      return true;
    });
  }

  /**
   * Delete a company from local storage
   */
  async deleteLocal(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.COMPANIES], 'readwrite');
      const store = transaction.objectStore(STORES.COMPANIES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete company'));
    });
  }

  /**
   * Update local company with incremented version
   */
  async updateLocal(company: OfflineCompany): Promise<void> {
    const db = await this.ensureDb();

    const updatedCompany: OfflineCompany = {
      ...company,
      local_version: company.local_version + 1,
      synced_at: null, // Mark as pending sync
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.COMPANIES], 'readwrite');
      const store = transaction.objectStore(STORES.COMPANIES);
      const request = store.put(updatedCompany);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to update company'));
    });
  }

  // =========================================================================
  // Sync Queue Operations
  // =========================================================================

  /**
   * Queue a change for later synchronization
   */
  async queueChange(
    action: 'create' | 'update' | 'delete',
    companyId: string,
    payload: CompanyCreate | CompanyUpdate | null
  ): Promise<void> {
    const db = await this.ensureDb();

    const queueItem: SyncQueueItem = {
      id: generateUUID(),
      company_id: companyId,
      action,
      payload,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.add(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to queue change'));
    });
  }

  /**
   * Get all queued changes
   */
  async getQueuedChanges(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('created_at');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get queued changes'));
    });
  }

  /**
   * Clear a processed queue item
   */
  async clearQueueItem(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear queue item'));
    });
  }

  /**
   * Clear all queue items for a specific company
   */
  async clearQueueForCompany(companyId: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('company_id');
      const request = index.openCursor(IDBKeyRange.only(companyId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () =>
        reject(new Error('Failed to clear company queue'));
    });
  }

  /**
   * Get count of pending changes
   */
  async getPendingCount(): Promise<number> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to count pending changes'));
    });
  }

  // =========================================================================
  // Conflict Management
  // =========================================================================

  /**
   * Store a sync conflict for user resolution
   */
  async storeConflict(
    companyId: string,
    localVersion: OfflineCompany,
    serverVersion: Company
  ): Promise<void> {
    const db = await this.ensureDb();

    const conflict: SyncConflict = {
      company_id: companyId,
      local_version: localVersion,
      server_version: serverVersion,
      detected_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CONFLICTS], 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const request = store.put(conflict);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store conflict'));
    });
  }

  /**
   * Get all unresolved conflicts
   */
  async getConflicts(): Promise<SyncConflict[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CONFLICTS], 'readonly');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get conflicts'));
    });
  }

  /**
   * Resolve a conflict by choosing local or server version
   */
  async resolveConflict(
    companyId: string,
    resolution: 'local' | 'server'
  ): Promise<void> {
    const db = await this.ensureDb();

    // Get the conflict
    const conflicts = await this.getConflicts();
    const conflict = conflicts.find((c) => c.company_id === companyId);

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    // Apply resolution
    if (resolution === 'server') {
      // Overwrite local with server version
      await this.saveLocal(conflict.server_version, true);
    }
    // If 'local', the local version stays and will be synced

    // Clear the conflict
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CONFLICTS], 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICTS);
      const request = store.delete(companyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to resolve conflict'));
    });
  }

  // =========================================================================
  // Sync Operations (placeholder - actual sync with Supabase in company-service)
  // =========================================================================

  /**
   * Get sync summary
   */
  async getSyncSummary(): Promise<{
    pending: number;
    conflicts: number;
    lastSync: string | null;
  }> {
    const pending = await this.getPendingCount();
    const conflicts = await this.getConflicts();

    // Get most recent synced_at
    const companies = await this.getAllLocal();
    const syncedCompanies = companies.filter((c) => c.synced_at);
    const lastSync = syncedCompanies.length
      ? syncedCompanies.reduce((latest, c) =>
          c.synced_at! > (latest.synced_at ?? '') ? c : latest
        ).synced_at
      : null;

    return {
      pending,
      conflicts: conflicts.length,
      lastSync,
    };
  }

  // =========================================================================
  // Geocode Cache (used by geocoding service)
  // =========================================================================

  /**
   * Get cached geocode result
   */
  async getCachedGeocode(addressKey: string): Promise<GeocodeCache | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.GEOCODE_CACHE], 'readonly');
      const store = transaction.objectStore(STORES.GEOCODE_CACHE);
      const request = store.get(addressKey);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get cached geocode'));
    });
  }

  /**
   * Store geocode result in cache
   */
  async cacheGeocode(cache: GeocodeCache): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.GEOCODE_CACHE], 'readwrite');
      const store = transaction.objectStore(STORES.GEOCODE_CACHE);
      const request = store.put(cache);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to cache geocode'));
    });
  }

  /**
   * Clear old cache entries
   */
  async cleanGeocodeCache(maxAgeMs: number): Promise<void> {
    const db = await this.ensureDb();
    const cutoff = Date.now() - maxAgeMs;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.GEOCODE_CACHE], 'readwrite');
      const store = transaction.objectStore(STORES.GEOCODE_CACHE);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(new Error('Failed to clean cache'));
    });
  }

  // =========================================================================
  // Local Job Application Operations
  // =========================================================================

  /**
   * Save a job application to local storage
   */
  async saveJobAppLocal(
    application: JobApplication,
    synced: boolean = false
  ): Promise<void> {
    const db = await this.ensureDb();

    const offlineApp: OfflineJobApplication = {
      ...application,
      synced_at: synced ? new Date().toISOString() : null,
      local_version: 1,
      server_version: synced ? 1 : 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APPLICATIONS],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.JOB_APPLICATIONS);
      const request = store.put(offlineApp);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to save job application locally'));
    });
  }

  /**
   * Get a job application by ID from local storage
   */
  async getJobAppLocal(id: string): Promise<OfflineJobApplication | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.JOB_APPLICATIONS], 'readonly');
      const store = transaction.objectStore(STORES.JOB_APPLICATIONS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () =>
        reject(new Error('Failed to get job application'));
    });
  }

  /**
   * Get all job applications for a company from local storage
   */
  async getJobAppsByCompanyLocal(
    companyId: string
  ): Promise<OfflineJobApplication[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.JOB_APPLICATIONS], 'readonly');
      const store = transaction.objectStore(STORES.JOB_APPLICATIONS);
      const index = store.index('company_id');
      const request = index.getAll(IDBKeyRange.only(companyId));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get job applications'));
    });
  }

  /**
   * Get all job applications from local storage with optional filtering
   */
  async getAllJobAppsLocal(
    filters?: JobApplicationFilters
  ): Promise<OfflineJobApplication[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.JOB_APPLICATIONS], 'readonly');
      const store = transaction.objectStore(STORES.JOB_APPLICATIONS);
      const request = store.getAll();

      request.onsuccess = () => {
        let applications = request.result as OfflineJobApplication[];

        if (filters) {
          applications = this.applyJobAppFilters(applications, filters);
        }

        resolve(applications);
      };
      request.onerror = () =>
        reject(new Error('Failed to get job applications'));
    });
  }

  /**
   * Apply filters to job application list (client-side filtering)
   */
  private applyJobAppFilters(
    applications: OfflineJobApplication[],
    filters: JobApplicationFilters
  ): OfflineJobApplication[] {
    return applications.filter((app) => {
      // Company filter (Feature 014: support both shared and private)
      if (
        filters.shared_company_id &&
        app.shared_company_id !== filters.shared_company_id
      ) {
        return false;
      }
      if (
        filters.private_company_id &&
        app.private_company_id !== filters.private_company_id
      ) {
        return false;
      }

      // Status filter
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        if (!statuses.includes(app.status)) return false;
      }

      // Outcome filter
      if (filters.outcome) {
        const outcomes = Array.isArray(filters.outcome)
          ? filters.outcome
          : [filters.outcome];
        if (!outcomes.includes(app.outcome)) return false;
      }

      // Work location type filter
      if (filters.work_location_type) {
        const types = Array.isArray(filters.work_location_type)
          ? filters.work_location_type
          : [filters.work_location_type];
        if (!types.includes(app.work_location_type)) return false;
      }

      // Priority filter
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority)
          ? filters.priority
          : [filters.priority];
        if (!priorities.includes(app.priority)) return false;
      }

      // Active filter
      if (filters.is_active !== undefined) {
        if (app.is_active !== filters.is_active) return false;
      }

      // Date range filters
      if (filters.date_applied_from && app.date_applied) {
        if (app.date_applied < filters.date_applied_from) return false;
      }
      if (filters.date_applied_to && app.date_applied) {
        if (app.date_applied > filters.date_applied_to) return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle =
          app.position_title?.toLowerCase().includes(searchLower) ?? false;
        const matchesNotes =
          app.notes?.toLowerCase().includes(searchLower) ?? false;

        if (!matchesTitle && !matchesNotes) return false;
      }

      return true;
    });
  }

  /**
   * Delete a job application from local storage
   */
  async deleteJobAppLocal(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APPLICATIONS],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.JOB_APPLICATIONS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to delete job application'));
    });
  }

  /**
   * Update local job application with incremented version
   */
  async updateJobAppLocal(application: OfflineJobApplication): Promise<void> {
    const db = await this.ensureDb();

    const updatedApp: OfflineJobApplication = {
      ...application,
      local_version: application.local_version + 1,
      synced_at: null, // Mark as pending sync
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APPLICATIONS],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.JOB_APPLICATIONS);
      const request = store.put(updatedApp);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to update job application'));
    });
  }

  // =========================================================================
  // Job Application Sync Queue Operations
  // =========================================================================

  /**
   * Queue a job application change for later synchronization
   */
  async queueJobAppChange(
    action: 'create' | 'update' | 'delete',
    applicationId: string,
    payload: JobApplicationCreate | JobApplicationUpdate | null
  ): Promise<void> {
    const db = await this.ensureDb();

    const queueItem: JobApplicationSyncQueueItem = {
      id: generateUUID(),
      application_id: applicationId,
      action,
      payload,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APP_SYNC_QUEUE],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.JOB_APP_SYNC_QUEUE);
      const request = store.add(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to queue job application change'));
    });
  }

  /**
   * Get all queued job application changes
   */
  async getQueuedJobAppChanges(): Promise<JobApplicationSyncQueueItem[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APP_SYNC_QUEUE],
        'readonly'
      );
      const store = transaction.objectStore(STORES.JOB_APP_SYNC_QUEUE);
      const index = store.index('created_at');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get queued job application changes'));
    });
  }

  /**
   * Clear a processed job application queue item
   */
  async clearJobAppQueueItem(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APP_SYNC_QUEUE],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.JOB_APP_SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to clear job application queue item'));
    });
  }

  /**
   * Get count of pending job application changes
   */
  async getPendingJobAppCount(): Promise<number> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APP_SYNC_QUEUE],
        'readonly'
      );
      const store = transaction.objectStore(STORES.JOB_APP_SYNC_QUEUE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to count pending job application changes'));
    });
  }

  // =========================================================================
  // Job Application Conflict Management
  // =========================================================================

  /**
   * Store a job application sync conflict for user resolution
   */
  async storeJobAppConflict(
    applicationId: string,
    localVersion: OfflineJobApplication,
    serverVersion: JobApplication
  ): Promise<void> {
    const db = await this.ensureDb();

    const conflict: JobApplicationSyncConflict = {
      application_id: applicationId,
      local_version: localVersion,
      server_version: serverVersion,
      detected_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APP_CONFLICTS],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.JOB_APP_CONFLICTS);
      const request = store.put(conflict);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to store job application conflict'));
    });
  }

  /**
   * Get all unresolved job application conflicts
   */
  async getJobAppConflicts(): Promise<JobApplicationSyncConflict[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APP_CONFLICTS],
        'readonly'
      );
      const store = transaction.objectStore(STORES.JOB_APP_CONFLICTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get job application conflicts'));
    });
  }

  /**
   * Resolve a job application conflict by choosing local or server version
   */
  async resolveJobAppConflict(
    applicationId: string,
    resolution: 'local' | 'server'
  ): Promise<void> {
    const db = await this.ensureDb();

    // Get the conflict
    const conflicts = await this.getJobAppConflicts();
    const conflict = conflicts.find((c) => c.application_id === applicationId);

    if (!conflict) {
      throw new Error('Job application conflict not found');
    }

    // Apply resolution
    if (resolution === 'server') {
      // Overwrite local with server version
      await this.saveJobAppLocal(conflict.server_version, true);
    }
    // If 'local', the local version stays and will be synced

    // Clear the conflict
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.JOB_APP_CONFLICTS],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.JOB_APP_CONFLICTS);
      const request = store.delete(applicationId);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to resolve job application conflict'));
    });
  }

  // =========================================================================
  // Feature 012: Private Company Operations
  // =========================================================================

  /**
   * Save a private company to local storage
   */
  async savePrivateCompanyLocal(
    company: PrivateCompany,
    synced: boolean = false
  ): Promise<void> {
    const db = await this.ensureDb();

    const offlineCompany: OfflinePrivateCompany = {
      ...company,
      synced_at: synced ? new Date().toISOString() : null,
      local_version: 1,
      server_version: synced ? 1 : 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_COMPANIES],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PRIVATE_COMPANIES);
      const request = store.put(offlineCompany);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to save private company locally'));
    });
  }

  /**
   * Get a private company by ID from local storage
   */
  async getPrivateCompanyLocal(
    id: string
  ): Promise<OfflinePrivateCompany | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_COMPANIES],
        'readonly'
      );
      const store = transaction.objectStore(STORES.PRIVATE_COMPANIES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () =>
        reject(new Error('Failed to get private company'));
    });
  }

  /**
   * Get all private companies from local storage
   */
  async getAllPrivateCompaniesLocal(
    userId?: string
  ): Promise<OfflinePrivateCompany[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_COMPANIES],
        'readonly'
      );
      const store = transaction.objectStore(STORES.PRIVATE_COMPANIES);

      let request: IDBRequest;
      if (userId) {
        const index = store.index('user_id');
        request = index.getAll(IDBKeyRange.only(userId));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get private companies'));
    });
  }

  /**
   * Delete a private company from local storage
   */
  async deletePrivateCompanyLocal(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_COMPANIES],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PRIVATE_COMPANIES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to delete private company'));
    });
  }

  /**
   * Update local private company with incremented version
   */
  async updatePrivateCompanyLocal(
    company: OfflinePrivateCompany
  ): Promise<void> {
    const db = await this.ensureDb();

    const updatedCompany: OfflinePrivateCompany = {
      ...company,
      local_version: company.local_version + 1,
      synced_at: null,
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_COMPANIES],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PRIVATE_COMPANIES);
      const request = store.put(updatedCompany);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to update private company'));
    });
  }

  /**
   * Queue a private company change for later synchronization
   */
  async queuePrivateCompanyChange(
    action: 'create' | 'update' | 'delete',
    privateCompanyId: string,
    payload: PrivateCompanyCreate | PrivateCompanyUpdate | null
  ): Promise<void> {
    const db = await this.ensureDb();

    const queueItem: PrivateCompanySyncQueueItem = {
      id: generateUUID(),
      private_company_id: privateCompanyId,
      action,
      payload,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_SYNC_QUEUE],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PRIVATE_SYNC_QUEUE);
      const request = store.add(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to queue private company change'));
    });
  }

  /**
   * Get all queued private company changes
   */
  async getQueuedPrivateCompanyChanges(): Promise<
    PrivateCompanySyncQueueItem[]
  > {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_SYNC_QUEUE],
        'readonly'
      );
      const store = transaction.objectStore(STORES.PRIVATE_SYNC_QUEUE);
      const index = store.index('created_at');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get queued private company changes'));
    });
  }

  /**
   * Clear a processed private company queue item
   */
  async clearPrivateCompanyQueueItem(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_SYNC_QUEUE],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PRIVATE_SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to clear private company queue item'));
    });
  }

  /**
   * Get count of pending private company changes
   */
  async getPendingPrivateCompanyCount(): Promise<number> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.PRIVATE_SYNC_QUEUE],
        'readonly'
      );
      const store = transaction.objectStore(STORES.PRIVATE_SYNC_QUEUE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to count pending private company changes'));
    });
  }

  // =========================================================================
  // Feature 012: User Company Tracking Operations
  // =========================================================================

  /**
   * Save user tracking to local storage
   */
  async saveTrackingLocal(
    tracking: UserCompanyTracking,
    synced: boolean = false
  ): Promise<void> {
    const db = await this.ensureDb();

    const offlineTracking: OfflineUserCompanyTracking = {
      ...tracking,
      synced_at: synced ? new Date().toISOString() : null,
      local_version: 1,
      server_version: synced ? 1 : 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TRACKING], 'readwrite');
      const store = transaction.objectStore(STORES.TRACKING);
      const request = store.put(offlineTracking);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to save tracking locally'));
    });
  }

  /**
   * Get tracking by ID from local storage
   */
  async getTrackingLocal(
    id: string
  ): Promise<OfflineUserCompanyTracking | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TRACKING], 'readonly');
      const store = transaction.objectStore(STORES.TRACKING);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get tracking'));
    });
  }

  /**
   * Get all tracking records from local storage
   */
  async getAllTrackingLocal(
    userId?: string
  ): Promise<OfflineUserCompanyTracking[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TRACKING], 'readonly');
      const store = transaction.objectStore(STORES.TRACKING);

      let request: IDBRequest;
      if (userId) {
        const index = store.index('user_id');
        request = index.getAll(IDBKeyRange.only(userId));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get tracking records'));
    });
  }

  /**
   * Queue a tracking change for later synchronization
   */
  async queueTrackingChange(
    action: 'create' | 'update' | 'delete',
    trackingId: string,
    payload: TrackSharedCompanyCreate | UserCompanyTrackingUpdate | null
  ): Promise<void> {
    const db = await this.ensureDb();

    const queueItem: TrackingSyncQueueItem = {
      id: generateUUID(),
      tracking_id: trackingId,
      action,
      payload,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.TRACKING_SYNC_QUEUE],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.TRACKING_SYNC_QUEUE);
      const request = store.add(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to queue tracking change'));
    });
  }

  /**
   * Get all queued tracking changes
   */
  async getQueuedTrackingChanges(): Promise<TrackingSyncQueueItem[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.TRACKING_SYNC_QUEUE],
        'readonly'
      );
      const store = transaction.objectStore(STORES.TRACKING_SYNC_QUEUE);
      const index = store.index('created_at');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get queued tracking changes'));
    });
  }

  /**
   * Clear a processed tracking queue item
   */
  async clearTrackingQueueItem(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.TRACKING_SYNC_QUEUE],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.TRACKING_SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to clear tracking queue item'));
    });
  }

  // =========================================================================
  // Feature 012: Metro Areas Cache (Read-only)
  // =========================================================================

  /**
   * Cache all metro areas
   */
  async cacheMetroAreas(areas: MetroArea[]): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METRO_AREAS], 'readwrite');
      const store = transaction.objectStore(STORES.METRO_AREAS);

      // Clear existing and add new
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completed = 0;
        if (areas.length === 0) {
          resolve();
          return;
        }

        areas.forEach((area) => {
          const addRequest = store.add(area);
          addRequest.onsuccess = () => {
            completed++;
            if (completed === areas.length) {
              resolve();
            }
          };
          addRequest.onerror = () =>
            reject(new Error('Failed to cache metro area'));
        });
      };
      clearRequest.onerror = () =>
        reject(new Error('Failed to clear metro areas cache'));
    });
  }

  /**
   * Get cached metro areas
   */
  async getCachedMetroAreas(): Promise<MetroArea[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METRO_AREAS], 'readonly');
      const store = transaction.objectStore(STORES.METRO_AREAS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get cached metro areas'));
    });
  }

  // =========================================================================
  // Feature 012: Shared Companies Cache (Read-only)
  // =========================================================================

  /**
   * Cache shared companies for a metro area
   */
  async cacheSharedCompanies(companies: SharedCompany[]): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.SHARED_COMPANIES],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.SHARED_COMPANIES);

      let completed = 0;
      if (companies.length === 0) {
        resolve();
        return;
      }

      companies.forEach((company) => {
        const request = store.put(company);
        request.onsuccess = () => {
          completed++;
          if (completed === companies.length) {
            resolve();
          }
        };
        request.onerror = () =>
          reject(new Error('Failed to cache shared company'));
      });
    });
  }

  /**
   * Get cached shared companies
   */
  async getCachedSharedCompanies(
    metroAreaId?: string
  ): Promise<SharedCompany[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SHARED_COMPANIES], 'readonly');
      const store = transaction.objectStore(STORES.SHARED_COMPANIES);

      let request: IDBRequest;
      if (metroAreaId) {
        const index = store.index('metro_area_id');
        request = index.getAll(IDBKeyRange.only(metroAreaId));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Failed to get cached shared companies'));
    });
  }

  // =========================================================================
  // Feature 012: Unified View Cache
  // =========================================================================

  /**
   * Cache unified company view
   */
  async cacheUnifiedCompanies(
    cacheKey: string,
    companies: UnifiedCompany[]
  ): Promise<void> {
    const db = await this.ensureDb();

    const entry = {
      cache_key: cacheKey,
      companies,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UNIFIED_CACHE], 'readwrite');
      const store = transaction.objectStore(STORES.UNIFIED_CACHE);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to cache unified companies'));
    });
  }

  /**
   * Get cached unified companies
   */
  async getCachedUnifiedCompanies(
    cacheKey: string,
    maxAgeMs: number = 5 * 60 * 1000
  ): Promise<UnifiedCompany[] | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UNIFIED_CACHE], 'readonly');
      const store = transaction.objectStore(STORES.UNIFIED_CACHE);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check if cache is expired
        if (Date.now() - entry.timestamp > maxAgeMs) {
          resolve(null);
          return;
        }

        resolve(entry.companies);
      };
      request.onerror = () =>
        reject(new Error('Failed to get cached unified companies'));
    });
  }

  /**
   * Clear unified cache
   */
  async clearUnifiedCache(): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.UNIFIED_CACHE], 'readwrite');
      const store = transaction.objectStore(STORES.UNIFIED_CACHE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Failed to clear unified cache'));
    });
  }

  // =========================================================================
  // Feature 012: Sync Summary
  // =========================================================================

  /**
   * Get Feature 012 sync summary
   */
  async getMultiTenantSyncSummary(): Promise<{
    pendingPrivateCompanies: number;
    pendingTracking: number;
    cachedMetroAreas: number;
    cachedSharedCompanies: number;
  }> {
    const [privateQueue, trackingQueue, metroAreas, sharedCompanies] =
      await Promise.all([
        this.getQueuedPrivateCompanyChanges(),
        this.getQueuedTrackingChanges(),
        this.getCachedMetroAreas(),
        this.getCachedSharedCompanies(),
      ]);

    return {
      pendingPrivateCompanies: privateQueue.length,
      pendingTracking: trackingQueue.length,
      cachedMetroAreas: metroAreas.length,
      cachedSharedCompanies: sharedCompanies.length,
    };
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();
