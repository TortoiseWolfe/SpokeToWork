# Contract: Offline Sync Service

**Module**: `src/lib/companies/offline-sync.ts`

## Overview

Manages IndexedDB storage and synchronization with Supabase for offline-first company management.

## Interface

```typescript
export interface OfflineSyncService {
  // Database lifecycle
  initialize(): Promise<void>;

  // Local operations
  saveLocal(company: Company): Promise<void>;
  getLocal(id: string): Promise<OfflineCompany | null>;
  getAllLocal(filters?: CompanyFilters): Promise<OfflineCompany[]>;
  deleteLocal(id: string): Promise<void>;

  // Sync queue
  queueChange(action: 'create' | 'update' | 'delete', data: any): Promise<void>;
  getQueuedChanges(): Promise<SyncQueueItem[]>;
  clearQueueItem(id: string): Promise<void>;

  // Sync operations
  sync(): Promise<SyncResult>;
  getConflicts(): Promise<SyncConflict[]>;
  resolveConflict(
    companyId: string,
    resolution: 'local' | 'server'
  ): Promise<void>;

  // Status
  isOnline(): boolean;
  getPendingCount(): Promise<number>;
}
```

## IndexedDB Schema

**Database Name:** `spoketowork-companies`
**Version:** 1

### Object Stores

#### `companies`

```typescript
{
  keyPath: 'id',
  indexes: [
    { name: 'user_id', keyPath: 'user_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'synced_at', keyPath: 'synced_at' },
    { name: 'updated_at', keyPath: 'updated_at' }
  ]
}
```

#### `sync_queue`

```typescript
{
  keyPath: 'id',
  autoIncrement: false,
  indexes: [
    { name: 'company_id', keyPath: 'company_id' },
    { name: 'created_at', keyPath: 'created_at' }
  ]
}
```

#### `conflicts`

```typescript
{
  keyPath: 'company_id',
  indexes: [
    { name: 'detected_at', keyPath: 'detected_at' }
  ]
}
```

#### `geocode_cache`

```typescript
{
  keyPath: 'address_key', // Normalized address
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp' }
  ]
}
```

## Sync Algorithm

### On Save (Online)

```
1. POST to Supabase
2. On success:
   - Update IndexedDB with server response
   - Set synced_at = now()
3. On network error:
   - Save to IndexedDB with synced_at = null
   - Queue change for later sync
```

### On Save (Offline)

```
1. Save to IndexedDB with synced_at = null
2. Increment local_version
3. Add to sync_queue
4. Return optimistic response
```

### On Network Reconnect

```
1. Get all items from sync_queue ordered by created_at
2. For each item:
   a. If action = 'create':
      - POST to Supabase
      - Update local record with server ID
   b. If action = 'update':
      - Fetch server version
      - If server_version > local cached server_version:
        - CONFLICT detected → store in conflicts
      - Else:
        - PATCH to Supabase
   c. If action = 'delete':
      - DELETE from Supabase
3. Clear processed items from queue
4. Return summary
```

### Conflict Resolution

```
User chooses 'local' or 'server':

If 'local':
  - Force PATCH to Supabase with local data
  - Update server_version
  - Clear conflict

If 'server':
  - Overwrite local with server data
  - Update both versions
  - Clear conflict
```

## Conflict Detection

A conflict is detected when:

1. User modifies a record offline
2. Upon sync, the server version's `updated_at` is newer than `synced_at`

```typescript
if (serverRecord.updated_at > localRecord.synced_at) {
  // Conflict: server was modified while we were offline
}
```

## Versioning

Each local record tracks:

- `local_version`: Incremented on every local edit
- `server_version`: Set from server's version on sync
- `synced_at`: Timestamp of last successful sync

## Network Detection

```typescript
// Use navigator.onLine with event listeners
window.addEventListener('online', onNetworkReconnect);
window.addEventListener('offline', onNetworkDisconnect);

// Fallback: ping check on critical operations
async function isActuallyOnline(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
```

## Data Migration

When schema changes (version bump):

```typescript
const db = await openDB('spoketowork-companies', 2, {
  upgrade(db, oldVersion, newVersion) {
    if (oldVersion < 2) {
      // Migration from v1 to v2
      const store = db.objectStoreNames.contains('companies')
        ? db.transaction('companies', 'readwrite').objectStore('companies')
        : db.createObjectStore('companies', { keyPath: 'id' });
      // Add new indexes, transform data, etc.
    }
  },
});
```

## Storage Limits

- IndexedDB quota varies by browser (typically 50MB minimum)
- Implement storage check before large imports
- Warn user if approaching limit
- Consider compressing notes field if storage constrained
