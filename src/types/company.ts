/**
 * Company Management Types - Feature 011
 *
 * Type definitions for company tracking, offline sync, and geocoding.
 * @see specs/011-company-management/data-model.md
 */

/**
 * Application status for job hunting workflow
 */
export type ApplicationStatus =
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
  field: 'name' | 'status' | 'priority' | 'created_at' | 'follow_up_date';
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
