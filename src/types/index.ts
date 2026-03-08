/**
 * Types - Barrel Export
 *
 * Central export point for all application types.
 */

// ServiceResult pattern for consistent error handling
export {
  type ServiceResult,
  success,
  failure,
  isSuccess,
  isFailure,
  tryCatch,
} from './result';

// Company Management types (Feature 011)
export type {
  CompanyStatus,
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
} from './company';
