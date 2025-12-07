/**
 * Company Management Service - Barrel Export
 * Features 011 & 012
 *
 * Central export point for company management functionality.
 * @see specs/011-company-management/
 * @see specs/012-multi-tenant-companies/
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
  // Feature 011 Offline types
  OfflineCompany,
  OfflineJobApplication,
  SyncQueueItem,
  JobApplicationSyncQueueItem,
  SyncConflict,
  JobApplicationSyncConflict,
  // Feature 012 Offline types
  OfflinePrivateCompany,
  OfflineUserCompanyTracking,
  PrivateCompanySyncQueueItem,
  TrackingSyncQueueItem,
  PrivateCompanySyncConflict,
  TrackingSyncConflict,
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
  validateMetroAreaCoordinates,
  METRO_AREA_WARNING_THRESHOLD,
  normalizeAddress,
  clearCache,
  getQueueLength,
} from './geocoding';

export type { MetroAreaValidationResult } from './geocoding';

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

// Multi-tenant company service (Feature 012)
export {
  MultiTenantCompanyService,
  TrackingExistsError,
  ContributionPendingError,
  UnauthorizedError,
} from './multi-tenant-service';

// Seed service (Feature 012 - US4)
export { SeedService } from './seed-service';
export type { MetroAreaWithSeedCount } from './seed-service';

// Admin moderation service (Feature 012 - US7)
export { AdminModerationService } from './admin-moderation-service';
export type { ModerationQueueItem } from './admin-moderation-service';

// Re-export Feature 012 types
export type {
  // Multi-tenant types
  ContributionStatus,
  MatchConfidence,
  CompanySource,
  MetroArea,
  SharedCompany,
  CompanyLocation,
  UserCompanyTracking,
  PrivateCompany,
  CompanyContribution,
  CompanyEditSuggestion,
  UnifiedCompany,
  MatchResult,
  TrackSharedCompanyCreate,
  UserCompanyTrackingUpdate,
  PrivateCompanyCreate,
  PrivateCompanyUpdate,
  EditSuggestionCreate,
  UnifiedCompanyFilters,
  UnifiedCompanySort,
} from '@/types/company';

// Re-export Feature 012 display constants
export {
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_STATUS_COLORS,
  COMPANY_SOURCE_LABELS,
  COMPANY_SOURCE_COLORS,
  MATCH_CONFIDENCE_LABELS,
  MATCH_CONFIDENCE_COLORS,
} from '@/types/company';
