/**
 * Company Management Types - Feature 011
 *
 * Type definitions for company tracking, job applications, offline sync, and geocoding.
 * @see specs/011-company-management/data-model.md
 */

// =============================================================================
// LEGACY COMPANY STATUS (for existing company tracking)
// =============================================================================

/**
 * Legacy company contact status (kept for backward compatibility)
 * @deprecated Use JobApplicationStatus for job tracking
 */
export type CompanyStatus =
  | 'not_contacted'
  | 'contacted'
  | 'follow_up'
  | 'meeting'
  | 'outcome_positive'
  | 'outcome_negative';

/**
 * @deprecated Use CompanyStatus instead
 */
export type ApplicationStatus = CompanyStatus;

/**
 * Priority levels (1 = highest, 5 = lowest)
 */
export type Priority = 1 | 2 | 3 | 4 | 5;

// =============================================================================
// JOB APPLICATION TYPES (new parent-child model)
// =============================================================================

/**
 * Work location type for job applications
 */
export type WorkLocationType = 'remote' | 'hybrid' | 'on_site';

/**
 * Job application status (workflow stages)
 */
export type JobApplicationStatus =
  | 'not_applied'
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offer'
  | 'closed';

/**
 * Job application outcome (final result)
 */
export type ApplicationOutcome =
  | 'pending'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | 'ghosted'
  | 'offer_declined';

/**
 * Job application entity - tracks individual job applications per company
 */
export interface JobApplication {
  id: string;
  company_id: string;
  user_id: string;

  // Job details
  position_title: string | null;
  job_link: string | null; // URL to specific job posting

  // Work arrangement
  work_location_type: WorkLocationType;

  // Status tracking
  status: JobApplicationStatus;
  outcome: ApplicationOutcome;

  // Dates
  date_applied: string | null; // ISO date string
  interview_date: string | null; // ISO datetime string
  follow_up_date: string | null; // ISO date string

  // Priority & notes
  priority: Priority;
  notes: string | null;

  // State
  is_active: boolean;

  // Timestamps
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * Job application creation payload
 */
export interface JobApplicationCreate {
  company_id: string;
  position_title?: string;
  job_link?: string;
  work_location_type?: WorkLocationType;
  status?: JobApplicationStatus;
  outcome?: ApplicationOutcome;
  date_applied?: string;
  interview_date?: string;
  follow_up_date?: string;
  priority?: Priority;
  notes?: string;
}

/**
 * Job application update payload
 */
export interface JobApplicationUpdate {
  id: string;
  position_title?: string | null;
  job_link?: string | null;
  work_location_type?: WorkLocationType;
  status?: JobApplicationStatus;
  outcome?: ApplicationOutcome;
  date_applied?: string | null;
  interview_date?: string | null;
  follow_up_date?: string | null;
  priority?: Priority;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Filter options for job application list
 */
export interface JobApplicationFilters {
  company_id?: string;
  status?: JobApplicationStatus | JobApplicationStatus[];
  outcome?: ApplicationOutcome | ApplicationOutcome[];
  work_location_type?: WorkLocationType | WorkLocationType[];
  priority?: Priority | Priority[];
  is_active?: boolean;
  date_applied_from?: string;
  date_applied_to?: string;
  search?: string; // Free-text search
}

/**
 * Sort options for job application list
 */
export interface JobApplicationSort {
  field:
    | 'position_title'
    | 'status'
    | 'outcome'
    | 'date_applied'
    | 'interview_date'
    | 'priority'
    | 'created_at';
  direction: 'asc' | 'desc';
}

/**
 * Company with its job applications (parent-child model)
 */
export interface CompanyWithApplications extends Company {
  applications: JobApplication[];
  latest_application: JobApplication | null;
  total_applications: number;
}

/**
 * Company entity - core data model for Feature 011
 */
export interface Company {
  id: string;
  user_id: string;

  // Identity
  name: string;

  // Contact
  contact_name: string | null;
  contact_title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  careers_url: string | null;

  // Location
  address: string;
  latitude: number;
  longitude: number;
  extended_range: boolean;

  // Tracking
  status: ApplicationStatus;
  priority: Priority;
  notes: string | null;
  follow_up_date: string | null; // ISO date string

  // Route (nullable until route feature implemented)
  route_id: string | null;

  // State
  is_active: boolean;

  // Timestamps
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * Company creation payload (subset of Company)
 */
export interface CompanyCreate {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_name?: string;
  contact_title?: string;
  phone?: string;
  email?: string;
  website?: string;
  careers_url?: string;
  status?: ApplicationStatus;
  priority?: Priority;
  notes?: string;
  follow_up_date?: string;
  extended_range?: boolean;
}

/**
 * Company update payload (all fields optional except id)
 */
export interface CompanyUpdate {
  id: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contact_name?: string | null;
  contact_title?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  careers_url?: string | null;
  status?: ApplicationStatus;
  priority?: Priority;
  notes?: string | null;
  follow_up_date?: string | null;
  route_id?: string | null;
  is_active?: boolean;
  extended_range?: boolean;
}

/**
 * Filter options for company list
 */
export interface CompanyFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  priority?: Priority | Priority[];
  route_id?: string | null;
  is_active?: boolean;
  extended_range?: boolean;
  search?: string; // Free-text search
}

/**
 * Sort options for company list
 */
export interface CompanySort {
  field:
    | 'name'
    | 'status'
    | 'priority'
    | 'created_at'
    | 'follow_up_date'
    | 'zip_code';
  direction: 'asc' | 'desc';
}

/**
 * Home location settings for distance calculations
 */
export interface HomeLocation {
  address: string;
  latitude: number;
  longitude: number;
  radius_miles: number;
}

/**
 * Geocode result from Nominatim API
 */
export interface GeocodeResult {
  success: boolean;
  address: string;
  latitude?: number;
  longitude?: number;
  display_name?: string;
  error?: string;
  cached?: boolean;
}

/**
 * Distance validation result
 */
export interface DistanceResult {
  distance_miles: number;
  within_radius: boolean;
  extended_range: boolean;
}

/**
 * Import result summary
 */
export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

/**
 * Sync result summary
 */
export interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
}

/**
 * Offline company with sync metadata
 */
export interface OfflineCompany extends Company {
  synced_at: string | null; // null = pending sync
  local_version: number; // Increment on each local edit
  server_version: number; // Last known server version
}

/**
 * Sync queue item for pending changes
 */
export interface SyncQueueItem {
  id: string;
  company_id: string;
  action: 'create' | 'update' | 'delete';
  payload: CompanyCreate | CompanyUpdate | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

/**
 * Sync conflict between local and server versions
 */
export interface SyncConflict {
  company_id: string;
  local_version: OfflineCompany;
  server_version: Company;
  detected_at: string;
}

/**
 * Geocode cache entry
 */
export interface GeocodeCache {
  address_key: string; // Normalized address
  result: GeocodeResult;
  timestamp: number;
}

// =============================================================================
// OFFLINE JOB APPLICATION TYPES
// =============================================================================

/**
 * Offline job application with sync metadata
 */
export interface OfflineJobApplication extends JobApplication {
  synced_at: string | null; // null = pending sync
  local_version: number; // Increment on each local edit
  server_version: number; // Last known server version
}

/**
 * Sync queue item for pending job application changes
 */
export interface JobApplicationSyncQueueItem {
  id: string;
  application_id: string;
  action: 'create' | 'update' | 'delete';
  payload: JobApplicationCreate | JobApplicationUpdate | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

/**
 * Sync conflict between local and server job application versions
 */
export interface JobApplicationSyncConflict {
  application_id: string;
  local_version: OfflineJobApplication;
  server_version: JobApplication;
  detected_at: string;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Display labels for work location types
 */
export const WORK_LOCATION_LABELS: Record<WorkLocationType, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
};

/**
 * Display labels for job application statuses
 */
export const JOB_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  not_applied: 'Not Applied',
  applied: 'Applied',
  screening: 'Screening',
  interviewing: 'Interviewing',
  offer: 'Offer',
  closed: 'Closed',
};

/**
 * Display labels for application outcomes
 */
export const OUTCOME_LABELS: Record<ApplicationOutcome, string> = {
  pending: 'Pending',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
  offer_declined: 'Offer Declined',
};

/**
 * Color classes for job application statuses (DaisyUI/Tailwind)
 */
export const JOB_STATUS_COLORS: Record<JobApplicationStatus, string> = {
  not_applied: 'badge-ghost',
  applied: 'badge-info',
  screening: 'badge-warning',
  interviewing: 'badge-primary',
  offer: 'badge-success',
  closed: 'badge-neutral',
};

/**
 * Color classes for application outcomes (DaisyUI/Tailwind)
 */
export const OUTCOME_COLORS: Record<ApplicationOutcome, string> = {
  pending: 'badge-ghost',
  hired: 'badge-success',
  rejected: 'badge-error',
  withdrawn: 'badge-warning',
  ghosted: 'badge-neutral',
  offer_declined: 'badge-warning',
};
