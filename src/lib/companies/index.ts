/**
 * Company Management Service - Barrel Export
 * Feature 011
 *
 * Central export point for company management functionality.
 * @see specs/011-company-management/
 */

// Re-export types from centralized location
export type {
  // Legacy company types
  ApplicationStatus,
  CompanyStatus,
  Priority,
  Company,
  CompanyCreate,
  CompanyUpdate,
  CompanyFilters,
  CompanySort,
  // Job application types
  WorkLocationType,
  JobApplicationStatus,
  ApplicationOutcome,
  JobApplication,
  JobApplicationCreate,
  JobApplicationUpdate,
  JobApplicationFilters,
  JobApplicationSort,
  CompanyWithApplications,
  // Offline types
  OfflineCompany,
  OfflineJobApplication,
  SyncQueueItem,
  JobApplicationSyncQueueItem,
  SyncConflict,
  JobApplicationSyncConflict,
  // Utility types
  HomeLocation,
  GeocodeResult,
  DistanceResult,
  ImportResult,
  SyncResult,
  GeocodeCache,
} from '@/types/company';

// Re-export display constants
export {
  WORK_LOCATION_LABELS,
  JOB_STATUS_LABELS,
  OUTCOME_LABELS,
  JOB_STATUS_COLORS,
  OUTCOME_COLORS,
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

// Job application service
export {
  ApplicationService,
  ApplicationNotFoundError,
  ApplicationValidationError,
  CompanyNotFoundError,
} from './application-service';
