/**
 * Company Management Types - Feature 011 & 012
 *
 * Type definitions for company tracking, job applications, offline sync, geocoding,
 * and multi-tenant company data model.
 * @see specs/011-company-management/data-model.md
 * @see specs/012-multi-tenant-companies/data-model.md
 */

// =============================================================================
// LEGACY COMPANY STATUS (for existing company tracking)
// =============================================================================

/**
 * Company contact status for tracking relationship with companies
 */
export type CompanyStatus =
  | 'not_contacted'
  | 'contacted'
  | 'follow_up'
  | 'meeting'
  | 'outcome_positive'
  | 'outcome_negative';

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
 * Helper type for company reference (exactly one must be set)
 * @since Feature 014
 */
export type CompanyReference =
  | { shared_company_id: string; private_company_id: null }
  | { shared_company_id: null; private_company_id: string };

/**
 * Job application entity - tracks individual job applications per company
 * @updated Feature 014: Changed company_id to shared_company_id/private_company_id
 */
export interface JobApplication {
  id: string;
  shared_company_id: string | null; // FK to shared_companies (Feature 014)
  private_company_id: string | null; // FK to private_companies (Feature 014)
  user_id: string;

  // Job details
  position_title: string | null;
  job_link: string | null; // URL to careers page
  position_url: string | null; // URL to specific job posting
  status_url: string | null; // URL to candidate portal/status check

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
 * @updated Feature 014: Changed company_id to shared_company_id/private_company_id
 * Exactly one of shared_company_id or private_company_id must be provided
 */
export interface JobApplicationCreate {
  shared_company_id?: string | null; // Provide for shared company applications
  private_company_id?: string | null; // Provide for private company applications
  position_title?: string;
  job_link?: string;
  position_url?: string;
  status_url?: string;
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
  position_url?: string | null;
  status_url?: string | null;
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
 * @updated Feature 014: Changed company_id to shared_company_id/private_company_id
 */
export interface JobApplicationFilters {
  shared_company_id?: string; // Filter by shared company
  private_company_id?: string; // Filter by private company
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
  status: CompanyStatus;
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
  status?: CompanyStatus;
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
  status?: CompanyStatus;
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
  status?: CompanyStatus | CompanyStatus[];
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
    | 'zip_code'
    | 'applications';
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

// =============================================================================
// FEATURE 012: MULTI-TENANT COMPANY DATA MODEL
// =============================================================================

/**
 * Contribution/moderation status for community submissions
 */
export type ContributionStatus = 'pending' | 'approved' | 'rejected' | 'merged';

/**
 * Match confidence level for duplicate detection
 */
export type MatchConfidence = 'high' | 'medium' | 'low';

/**
 * Source type for unified company view
 */
export type CompanySource = 'shared' | 'private';

/**
 * Metro area - geographic region for organizing companies
 */
export interface MetroArea {
  id: string;
  name: string;
  state: string;
  center_lat: number;
  center_lng: number;
  radius_miles: number;
  created_at: string;
}

/**
 * Shared company - deduplicated company in community registry
 */
export interface SharedCompany {
  id: string;
  metro_area_id: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  is_verified: boolean;
  is_seed: boolean; // Whether this company is seed data for new users (T087)
  created_at: string;
  updated_at: string;
}

/**
 * Company location - physical address for a shared company
 * @updated Feature 014: Added contact_name, contact_title
 */
export interface CompanyLocation {
  id: string;
  shared_company_id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null; // Feature 014
  contact_title: string | null; // Feature 014
  is_headquarters: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User company tracking - user's relationship to a shared company
 */
export interface UserCompanyTracking {
  id: string;
  user_id: string;
  shared_company_id: string;
  location_id: string | null;
  status: CompanyStatus;
  priority: Priority;
  notes: string | null;
  contact_name: string | null;
  contact_title: string | null;
  follow_up_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Private company - user-owned company not yet in shared registry
 */
export interface PrivateCompany {
  id: string;
  user_id: string;
  metro_area_id: string | null;
  name: string;
  website: string | null;
  careers_url: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  contact_title: string | null;
  notes: string | null;
  status: CompanyStatus;
  priority: Priority;
  follow_up_date: string | null;
  is_active: boolean;
  submit_to_shared: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Company contribution - pending submission to shared registry
 */
export interface CompanyContribution {
  id: string;
  user_id: string;
  private_company_id: string;
  status: ContributionStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_shared_company_id: string | null;
  merged_with_company_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Company edit suggestion - pending data correction for shared company
 */
export interface CompanyEditSuggestion {
  id: string;
  user_id: string;
  shared_company_id: string;
  location_id: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string;
  reason: string | null;
  status: ContributionStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Unified company view - combines shared tracking + private companies
 * This matches the database view user_companies_unified
 */
export interface UnifiedCompany {
  source: CompanySource;
  tracking_id: string | null;
  company_id: string | null;
  private_company_id: string | null;
  user_id: string;
  metro_area_id: string | null;
  name: string;
  website: string | null;
  careers_url: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  contact_title: string | null;
  notes: string | null;
  status: CompanyStatus;
  priority: Priority;
  follow_up_date: string | null;
  is_active: boolean;
  is_verified: boolean;
  submit_to_shared: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Match result from find_similar_companies RPC
 */
export interface MatchResult {
  company_id: string;
  company_name: string;
  website: string | null;
  careers_url: string | null;
  is_verified: boolean;
  location_id: string | null;
  address: string | null;
  distance_miles: number | null;
  name_similarity: number;
  domain_match: boolean;
  confidence: MatchConfidence;
}

/**
 * Create payload for tracking a shared company
 */
export interface TrackSharedCompanyCreate {
  shared_company_id: string;
  location_id?: string;
  status?: CompanyStatus;
  priority?: Priority;
  notes?: string;
  contact_name?: string;
  contact_title?: string;
  follow_up_date?: string;
}

/**
 * Update payload for user company tracking
 */
export interface UserCompanyTrackingUpdate {
  id: string;
  location_id?: string | null;
  status?: CompanyStatus;
  priority?: Priority;
  notes?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  follow_up_date?: string | null;
  is_active?: boolean;
}

/**
 * Create payload for private company
 */
export interface PrivateCompanyCreate {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  careers_url?: string;
  phone?: string;
  email?: string;
  contact_name?: string;
  contact_title?: string;
  notes?: string;
  status?: CompanyStatus;
  priority?: Priority;
  follow_up_date?: string;
}

/**
 * Update payload for private company
 */
export interface PrivateCompanyUpdate {
  id: string;
  name?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  careers_url?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  notes?: string | null;
  status?: CompanyStatus;
  priority?: Priority;
  follow_up_date?: string | null;
  is_active?: boolean;
  submit_to_shared?: boolean;
}

/**
 * Create payload for edit suggestion
 */
export interface EditSuggestionCreate {
  shared_company_id: string;
  location_id?: string;
  field_name: 'phone' | 'email' | 'contact_name' | 'website' | 'careers_url';
  old_value?: string;
  new_value: string;
  reason?: string;
}

/**
 * Filter options for unified company list
 */
export interface UnifiedCompanyFilters {
  source?: CompanySource;
  metro_area_id?: string;
  status?: CompanyStatus | CompanyStatus[];
  priority?: Priority | Priority[];
  is_active?: boolean;
  is_verified?: boolean;
  search?: string;
}

/**
 * Sort options for unified company list
 */
export interface UnifiedCompanySort {
  field: 'name' | 'status' | 'priority' | 'created_at' | 'follow_up_date';
  direction: 'asc' | 'desc';
}

// =============================================================================
// FEATURE 012: OFFLINE TYPES
// =============================================================================

/**
 * Offline private company with sync metadata
 */
export interface OfflinePrivateCompany extends PrivateCompany {
  synced_at: string | null; // null = pending sync
  local_version: number; // Increment on each local edit
  server_version: number; // Last known server version
}

/**
 * Offline user company tracking with sync metadata
 */
export interface OfflineUserCompanyTracking extends UserCompanyTracking {
  synced_at: string | null;
  local_version: number;
  server_version: number;
}

/**
 * Sync queue item for pending private company changes
 */
export interface PrivateCompanySyncQueueItem {
  id: string;
  private_company_id: string;
  action: 'create' | 'update' | 'delete';
  payload: PrivateCompanyCreate | PrivateCompanyUpdate | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

/**
 * Sync queue item for pending tracking changes
 */
export interface TrackingSyncQueueItem {
  id: string;
  tracking_id: string;
  action: 'create' | 'update' | 'delete';
  payload: TrackSharedCompanyCreate | UserCompanyTrackingUpdate | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

/**
 * Sync conflict for private company
 */
export interface PrivateCompanySyncConflict {
  private_company_id: string;
  local_version: OfflinePrivateCompany;
  server_version: PrivateCompany;
  detected_at: string;
}

/**
 * Sync conflict for tracking
 */
export interface TrackingSyncConflict {
  tracking_id: string;
  local_version: OfflineUserCompanyTracking;
  server_version: UserCompanyTracking;
  detected_at: string;
}

// =============================================================================
// FEATURE 012: DISPLAY HELPERS
// =============================================================================

/**
 * Display labels for contribution statuses
 */
export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  merged: 'Merged',
};

/**
 * Color classes for contribution statuses (DaisyUI/Tailwind)
 */
export const CONTRIBUTION_STATUS_COLORS: Record<ContributionStatus, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-error',
  merged: 'badge-info',
};

/**
 * Display labels for company source
 */
export const COMPANY_SOURCE_LABELS: Record<CompanySource, string> = {
  shared: 'Community',
  private: 'Private',
};

/**
 * Color classes for company source (DaisyUI/Tailwind)
 * - shared: badge-info (cyan) - community/public companies
 * - private: badge-ghost (muted) - user's personal companies
 */
export const COMPANY_SOURCE_COLORS: Record<CompanySource, string> = {
  shared: 'badge-info',
  private: 'badge-ghost',
};

/**
 * Display labels for match confidence
 */
export const MATCH_CONFIDENCE_LABELS: Record<MatchConfidence, string> = {
  high: 'High Match',
  medium: 'Possible Match',
  low: 'Weak Match',
};

/**
 * Color classes for match confidence (DaisyUI/Tailwind)
 */
export const MATCH_CONFIDENCE_COLORS: Record<MatchConfidence, string> = {
  high: 'badge-success',
  medium: 'badge-warning',
  low: 'badge-ghost',
};
