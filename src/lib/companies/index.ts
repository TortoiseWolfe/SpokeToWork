/**
 * Company Management Service - Barrel Export
 * Feature 011
 *
 * Central export point for company management functionality.
 * @see specs/011-company-management/
 */

// Re-export types from centralized location
export type {
  ApplicationStatus,
  Priority,
  Company,
  CompanyCreate,
  CompanyUpdate,
  CompanyFilters,
  CompanySort,
  HomeLocation,
  GeocodeResult,
  DistanceResult,
  ImportResult,
  SyncResult,
  OfflineCompany,
  SyncQueueItem,
  SyncConflict,
  GeocodeCache,
} from '@/types/company';

// Geocoding service
export {
  geocode,
  geocodeBatch,
  haversineDistance,
  validateDistance,
  normalizeAddress,
  clearCache,
  getQueueLength,
} from './geocoding';

// Offline sync service
export { OfflineSyncService, offlineSyncService } from './offline-sync';

// Company service
export {
  CompanyService,
  DuplicateCompanyError,
  ValidationError,
  NotFoundError,
} from './company-service';
