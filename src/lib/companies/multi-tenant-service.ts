/**
 * Multi-Tenant Company Service - Feature 012
 *
 * Service for multi-tenant company operations including:
 * - Unified company view (shared + private)
 * - Match detection for duplicate prevention
 * - User company tracking
 * - Private company management
 * - Community contribution submissions
 *
 * @see specs/012-multi-tenant-companies/data-model.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import type {
  UnifiedCompany,
  UnifiedCompanyFilters,
  UnifiedCompanySort,
  MatchResult,
  SharedCompany,
  CompanyLocation,
  UserCompanyTracking,
  PrivateCompany,
  CompanyContribution,
  CompanyEditSuggestion,
  MetroArea,
  TrackSharedCompanyCreate,
  UserCompanyTrackingUpdate,
  PrivateCompanyCreate,
  PrivateCompanyUpdate,
  EditSuggestionCreate,
} from '@/types/company';

// Logger for company service operations
const logger = createLogger('lib:companies:service');

/**
 * Error types for multi-tenant operations
 */
export class TrackingExistsError extends Error {
  constructor(companyName: string) {
    super(`You are already tracking "${companyName}"`);
    this.name = 'TrackingExistsError';
  }
}

export class ContributionPendingError extends Error {
  constructor() {
    super('This company already has a pending contribution');
    this.name = 'ContributionPendingError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Multi-Tenant Company Service
 */
export class MultiTenantCompanyService {
  private supabase: SupabaseClient;
  private userId: string | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Initialize the service with current user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
  }

  // =========================================================================
  // Unified Company View
  // =========================================================================

  /**
   * Get unified list of companies (shared tracking + private)
   */
  async getUnifiedCompanies(
    filters?: UnifiedCompanyFilters,
    sort?: UnifiedCompanySort
  ): Promise<UnifiedCompany[]> {
    this.ensureInitialized();

    let query = this.supabase.from('user_companies_unified').select('*');

    // Apply filters
    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    if (filters?.metro_area_id) {
      query = query.eq('metro_area_id', filters.metro_area_id);
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      query = query.in('status', statuses);
    }

    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      query = query.in('priority', priorities);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.is_verified !== undefined) {
      query = query.eq('is_verified', filters.is_verified);
    }

    // Apply sorting
    const sortField = sort?.field ?? 'name';
    const sortDir = sort?.direction ?? 'asc';
    query = query.order(sortField, { ascending: sortDir === 'asc' });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let companies = data as UnifiedCompany[];

    // Apply search filter client-side
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      companies = companies.filter((c) => {
        return (
          c.name.toLowerCase().includes(searchLower) ||
          c.address?.toLowerCase().includes(searchLower) ||
          c.contact_name?.toLowerCase().includes(searchLower) ||
          c.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    return companies;
  }

  /**
   * Get count of unified companies by source
   */
  async getCompanyCountBySource(): Promise<{
    shared: number;
    private: number;
    total: number;
  }> {
    this.ensureInitialized();

    const { data, error } = await this.supabase
      .from('user_companies_unified')
      .select('source');

    if (error) {
      throw error;
    }

    const shared = data.filter((c) => c.source === 'shared').length;
    const privateCount = data.filter((c) => c.source === 'private').length;

    return {
      shared,
      private: privateCount,
      total: shared + privateCount,
    };
  }

  // =========================================================================
  // Match Detection
  // =========================================================================

  /**
   * Find similar companies in the shared registry
   * Uses fuzzy name matching + location proximity + domain matching
   */
  async findSimilarCompanies(
    companyName: string,
    latitude?: number,
    longitude?: number,
    websiteDomain?: string
  ): Promise<MatchResult[]> {
    this.ensureInitialized();

    const { data, error } = await this.supabase.rpc('find_similar_companies', {
      p_company_name: companyName,
      p_latitude: latitude ?? null,
      p_longitude: longitude ?? null,
      p_website_domain: websiteDomain ?? null,
    });

    if (error) {
      // If timeout or extension not available, return empty results
      if (
        error.message.includes('timeout') ||
        error.message.includes('extension')
      ) {
        console.warn('Match detection unavailable:', error.message);
        return [];
      }
      throw error;
    }

    return data as MatchResult[];
  }

  // =========================================================================
  // Shared Company Operations
  // =========================================================================

  /**
   * Get all shared companies (public read)
   */
  async getSharedCompanies(metroAreaId?: string): Promise<SharedCompany[]> {
    let query = this.supabase.from('shared_companies').select('*');

    if (metroAreaId) {
      query = query.eq('metro_area_id', metroAreaId);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw error;
    }

    return data as SharedCompany[];
  }

  /**
   * Get shared company by ID
   */
  async getSharedCompanyById(id: string): Promise<SharedCompany | null> {
    const { data, error } = await this.supabase
      .from('shared_companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as SharedCompany;
  }

  /**
   * Get locations for a shared company
   */
  async getCompanyLocations(
    sharedCompanyId: string
  ): Promise<CompanyLocation[]> {
    const { data, error } = await this.supabase
      .from('company_locations')
      .select('*')
      .eq('shared_company_id', sharedCompanyId)
      .order('is_headquarters', { ascending: false });

    if (error) {
      throw error;
    }

    return data as CompanyLocation[];
  }

  // =========================================================================
  // User Company Tracking
  // =========================================================================

  /**
   * Track a shared company
   */
  async trackSharedCompany(
    data: TrackSharedCompanyCreate
  ): Promise<UserCompanyTracking> {
    this.ensureInitialized();

    // Check if already tracking
    const { data: existing } = await this.supabase
      .from('user_company_tracking')
      .select('id')
      .eq('user_id', this.userId!)
      .eq('shared_company_id', data.shared_company_id)
      .single();

    if (existing) {
      const company = await this.getSharedCompanyById(data.shared_company_id);
      throw new TrackingExistsError(company?.name ?? 'this company');
    }

    const tracking = {
      user_id: this.userId!,
      shared_company_id: data.shared_company_id,
      location_id: data.location_id ?? null,
      status: data.status ?? 'not_contacted',
      priority: data.priority ?? 3,
      notes: data.notes ?? null,
      contact_name: data.contact_name ?? null,
      contact_title: data.contact_title ?? null,
      follow_up_date: data.follow_up_date ?? null,
      is_active: true,
    };

    const { data: inserted, error } = await this.supabase
      .from('user_company_tracking')
      .insert(tracking)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return inserted as UserCompanyTracking;
  }

  /**
   * Update user tracking record
   */
  async updateTracking(
    data: UserCompanyTrackingUpdate
  ): Promise<UserCompanyTracking> {
    this.ensureInitialized();

    const { data: updated, error } = await this.supabase
      .from('user_company_tracking')
      .update({
        location_id: data.location_id,
        status: data.status,
        priority: data.priority,
        notes: data.notes,
        contact_name: data.contact_name,
        contact_title: data.contact_title,
        follow_up_date: data.follow_up_date,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .eq('user_id', this.userId!)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updated as UserCompanyTracking;
  }

  /**
   * Stop tracking a shared company (soft delete)
   */
  async stopTrackingCompany(trackingId: string): Promise<void> {
    this.ensureInitialized();

    const { error } = await this.supabase
      .from('user_company_tracking')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', trackingId)
      .eq('user_id', this.userId!);

    if (error) {
      throw error;
    }
  }

  // =========================================================================
  // Private Company Operations
  // =========================================================================

  /**
   * Create a private company
   */
  async createPrivateCompany(
    data: PrivateCompanyCreate
  ): Promise<PrivateCompany> {
    this.ensureInitialized();

    const company = {
      user_id: this.userId!,
      name: data.name.trim(),
      address: data.address?.trim() ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      website: data.website?.trim() ?? null,
      careers_url: data.careers_url?.trim() ?? null,
      phone: data.phone?.trim() ?? null,
      email: data.email?.trim() ?? null,
      contact_name: data.contact_name?.trim() ?? null,
      contact_title: data.contact_title?.trim() ?? null,
      notes: data.notes?.trim() ?? null,
      status: data.status ?? 'not_contacted',
      priority: data.priority ?? 3,
      follow_up_date: data.follow_up_date ?? null,
      is_active: true,
      submit_to_shared: false,
      // metro_area_id will be auto-assigned by trigger
    };

    // Debug logging for company creation
    logger.debug('Creating private company', {
      userId: this.userId,
      companyName: company.name,
      hasAddress: !!company.address,
      hasCoords: !!(company.latitude && company.longitude),
      fieldCount: Object.keys(company).length,
    });

    const { data: inserted, error } = await this.supabase
      .from('private_companies')
      .insert(company)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create private company', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: this.userId,
        companyName: company.name,
      });
      throw error;
    }

    logger.debug('Private company created successfully', {
      companyId: inserted.id,
      companyName: inserted.name,
    });

    return inserted as PrivateCompany;
  }

  /**
   * Update a private company
   */
  async updatePrivateCompany(
    data: PrivateCompanyUpdate
  ): Promise<PrivateCompany> {
    this.ensureInitialized();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only include provided fields
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.address !== undefined) updateData.address = data.address?.trim();
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.website !== undefined) updateData.website = data.website?.trim();
    if (data.careers_url !== undefined)
      updateData.careers_url = data.careers_url?.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim();
    if (data.email !== undefined) updateData.email = data.email?.trim();
    if (data.contact_name !== undefined)
      updateData.contact_name = data.contact_name?.trim();
    if (data.contact_title !== undefined)
      updateData.contact_title = data.contact_title?.trim();
    if (data.notes !== undefined) updateData.notes = data.notes?.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.follow_up_date !== undefined)
      updateData.follow_up_date = data.follow_up_date;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.submit_to_shared !== undefined)
      updateData.submit_to_shared = data.submit_to_shared;

    const { data: updated, error } = await this.supabase
      .from('private_companies')
      .update(updateData)
      .eq('id', data.id)
      .eq('user_id', this.userId!)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updated as PrivateCompany;
  }

  /**
   * Delete a private company
   */
  async deletePrivateCompany(id: string): Promise<void> {
    this.ensureInitialized();

    const { error } = await this.supabase
      .from('private_companies')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId!);

    if (error) {
      throw error;
    }
  }

  // =========================================================================
  // Community Contributions
  // =========================================================================

  /**
   * Submit a private company to the community registry
   */
  async submitToSharedRegistry(
    privateCompanyId: string
  ): Promise<CompanyContribution> {
    this.ensureInitialized();

    // Check if there's already a pending contribution
    const { data: existing } = await this.supabase
      .from('company_contributions')
      .select('id')
      .eq('private_company_id', privateCompanyId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw new ContributionPendingError();
    }

    // Flag the private company
    await this.supabase
      .from('private_companies')
      .update({ submit_to_shared: true, updated_at: new Date().toISOString() })
      .eq('id', privateCompanyId)
      .eq('user_id', this.userId!);

    // Create contribution record
    const { data: contribution, error } = await this.supabase
      .from('company_contributions')
      .insert({
        user_id: this.userId!,
        private_company_id: privateCompanyId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return contribution as CompanyContribution;
  }

  /**
   * Get user's contribution history
   */
  async getMyContributions(): Promise<CompanyContribution[]> {
    this.ensureInitialized();

    const { data, error } = await this.supabase
      .from('company_contributions')
      .select('*')
      .eq('user_id', this.userId!)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data as CompanyContribution[];
  }

  // =========================================================================
  // Edit Suggestions
  // =========================================================================

  /**
   * Submit an edit suggestion for a shared company
   */
  async submitEditSuggestion(
    data: EditSuggestionCreate
  ): Promise<CompanyEditSuggestion> {
    this.ensureInitialized();

    const { data: suggestion, error } = await this.supabase
      .from('company_edit_suggestions')
      .insert({
        user_id: this.userId!,
        shared_company_id: data.shared_company_id,
        location_id: data.location_id ?? null,
        field_name: data.field_name,
        old_value: data.old_value ?? null,
        new_value: data.new_value,
        reason: data.reason ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return suggestion as CompanyEditSuggestion;
  }

  /**
   * Get user's edit suggestion history
   */
  async getMyEditSuggestions(): Promise<CompanyEditSuggestion[]> {
    this.ensureInitialized();

    const { data, error } = await this.supabase
      .from('company_edit_suggestions')
      .select('*')
      .eq('user_id', this.userId!)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data as CompanyEditSuggestion[];
  }

  // =========================================================================
  // Metro Areas
  // =========================================================================

  /**
   * Get all metro areas
   */
  async getMetroAreas(): Promise<MetroArea[]> {
    const { data, error } = await this.supabase
      .from('metro_areas')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    return data as MetroArea[];
  }

  /**
   * Get metro area by ID
   */
  async getMetroAreaById(id: string): Promise<MetroArea | null> {
    const { data, error } = await this.supabase
      .from('metro_areas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as MetroArea;
  }

  // =========================================================================
  // Admin Operations (requires is_admin flag)
  // =========================================================================

  /**
   * Get pending contributions (admin only)
   */
  async getPendingContributions(): Promise<CompanyContribution[]> {
    const { data, error } = await this.supabase
      .from('company_contributions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === 'PGRST301') {
        throw new UnauthorizedError('Admin access required');
      }
      throw error;
    }

    return data as CompanyContribution[];
  }

  /**
   * Get pending edit suggestions (admin only)
   */
  async getPendingEditSuggestions(): Promise<CompanyEditSuggestion[]> {
    const { data, error } = await this.supabase
      .from('company_edit_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === 'PGRST301') {
        throw new UnauthorizedError('Admin access required');
      }
      throw error;
    }

    return data as CompanyEditSuggestion[];
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private ensureInitialized(): void {
    if (!this.userId) {
      throw new Error(
        'MultiTenantCompanyService not initialized. Call initialize() first.'
      );
    }
  }
}
