/**
 * Job Application Service - Feature 011, Updated Feature 014
 *
 * Service for job application CRUD operations with offline support.
 * Handles tracking of job applications per company (parent-child model).
 *
 * @see specs/011-company-management/data-model.md
 * @updated Feature 014: Multi-tenant company references (shared_company_id/private_company_id)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  JobApplication,
  JobApplicationCreate,
  JobApplicationUpdate,
  JobApplicationFilters,
  JobApplicationSort,
  CompanyWithApplications,
  UnifiedCompany,
  SyncResult,
} from '@/types/company';

/**
 * Company type for determining which table to query
 * @since Feature 014
 */
export type CompanyType = 'shared' | 'private';

/**
 * Error types for job application operations
 */
export class ApplicationNotFoundError extends Error {
  constructor(id: string) {
    super(`Job application with id "${id}" not found`);
    this.name = 'ApplicationNotFoundError';
  }
}

export class ApplicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationValidationError';
  }
}

export class CompanyNotFoundError extends Error {
  constructor(id: string) {
    super(`Company with id "${id}" not found`);
    this.name = 'CompanyNotFoundError';
  }
}

/**
 * Job Application Service class
 */
export class ApplicationService {
  private supabase: SupabaseClient;
  private userId: string | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Initialize the service (required before use)
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
  }

  /**
   * Check if browser is online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  /**
   * Create a new job application
   * @updated Feature 014: Uses shared_company_id or private_company_id instead of company_id
   */
  async create(data: JobApplicationCreate): Promise<JobApplication> {
    this.ensureInitialized();

    // Validate: exactly one company reference must be provided
    const hasShared = !!data.shared_company_id;
    const hasPrivate = !!data.private_company_id;

    if (!hasShared && !hasPrivate) {
      throw new ApplicationValidationError(
        'Either shared_company_id or private_company_id is required'
      );
    }

    if (hasShared && hasPrivate) {
      throw new ApplicationValidationError(
        'Cannot specify both shared_company_id and private_company_id'
      );
    }

    // Verify company exists in the appropriate table
    if (hasShared) {
      const { data: company, error: companyError } = await this.supabase
        .from('shared_companies')
        .select('id')
        .eq('id', data.shared_company_id)
        .single();

      if (companyError || !company) {
        throw new CompanyNotFoundError(data.shared_company_id!);
      }
    } else {
      // Verify private company exists AND belongs to current user
      const { data: company, error: companyError } = await this.supabase
        .from('private_companies')
        .select('id, user_id')
        .eq('id', data.private_company_id)
        .single();

      if (companyError || !company) {
        throw new CompanyNotFoundError(data.private_company_id!);
      }

      // RLS should handle this, but double-check ownership
      if (company.user_id !== this.userId) {
        throw new ApplicationValidationError(
          "Cannot create application for another user's private company"
        );
      }
    }

    // Validate URL fields if provided
    if (data.job_link && !this.isValidUrl(data.job_link)) {
      throw new ApplicationValidationError('Invalid job link URL');
    }
    if (data.position_url && !this.isValidUrl(data.position_url)) {
      throw new ApplicationValidationError('Invalid position URL');
    }
    if (data.status_url && !this.isValidUrl(data.status_url)) {
      throw new ApplicationValidationError('Invalid status URL');
    }

    const application: Record<string, unknown> = {
      shared_company_id: data.shared_company_id || null,
      private_company_id: data.private_company_id || null,
      user_id: this.userId!,
      position_title: data.position_title?.trim() || null,
      job_link: data.job_link?.trim() || null,
      position_url: data.position_url?.trim() || null,
      status_url: data.status_url?.trim() || null,
      work_location_type: data.work_location_type ?? 'on_site',
      status: data.status ?? 'not_applied',
      outcome: data.outcome ?? 'pending',
      date_applied: data.date_applied || null,
      interview_date: data.interview_date || null,
      follow_up_date: data.follow_up_date || null,
      priority: data.priority ?? 3,
      notes: data.notes?.trim() || null,
      is_active: true,
    };

    const { data: inserted, error } = await this.supabase
      .from('job_applications')
      .insert(application)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return inserted;
  }

  /**
   * Get a job application by ID
   */
  async getById(id: string): Promise<JobApplication | null> {
    this.ensureInitialized();

    const { data, error } = await this.supabase
      .from('job_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data;
  }

  /**
   * Get all job applications for a company
   * @updated Feature 014: Uses companyType to determine which FK to query
   * @param companyId - The company ID (shared or private)
   * @param companyType - 'shared' or 'private' to determine which FK column to use
   * @param filters - Optional filters to apply
   * @param sort - Optional sort configuration
   */
  async getByCompanyId(
    companyId: string,
    companyType: CompanyType = 'shared',
    filters?: Omit<
      JobApplicationFilters,
      'shared_company_id' | 'private_company_id'
    >,
    sort?: JobApplicationSort
  ): Promise<JobApplication[]> {
    this.ensureInitialized();

    const fkColumn =
      companyType === 'shared' ? 'shared_company_id' : 'private_company_id';

    let query = this.supabase
      .from('job_applications')
      .select('*')
      .eq(fkColumn, companyId);

    // Apply additional filters
    query = this.applyFilters(query, filters);

    // Apply sorting
    const sortField = sort?.field ?? 'created_at';
    const sortDir = sort?.direction ?? 'desc';
    query = query.order(sortField, { ascending: sortDir === 'asc' });

    const { data, error } = await query;

    if (error) throw error;

    return data as JobApplication[];
  }

  /**
   * Get all job applications with optional filtering and sorting
   */
  async getAll(
    filters?: JobApplicationFilters,
    sort?: JobApplicationSort
  ): Promise<JobApplication[]> {
    this.ensureInitialized();

    let query = this.supabase.from('job_applications').select('*');

    // Apply filters
    query = this.applyFilters(query, filters);

    // Apply sorting
    const sortField = sort?.field ?? 'created_at';
    const sortDir = sort?.direction ?? 'desc';
    query = query.order(sortField, { ascending: sortDir === 'asc' });

    const { data, error } = await query;

    if (error) throw error;

    // Apply search filter client-side
    let applications = data as JobApplication[];
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      applications = applications.filter((a) => {
        return (
          a.position_title?.toLowerCase().includes(searchLower) ||
          a.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    return applications;
  }

  /**
   * Update an existing job application
   */
  async update(data: JobApplicationUpdate): Promise<JobApplication> {
    this.ensureInitialized();

    if (!data.id) {
      throw new ApplicationValidationError(
        'Application ID is required for update'
      );
    }

    const existing = await this.getById(data.id);
    if (!existing) {
      throw new ApplicationNotFoundError(data.id);
    }

    // Validate URL fields if provided
    if (data.job_link && !this.isValidUrl(data.job_link)) {
      throw new ApplicationValidationError('Invalid job link URL');
    }
    if (data.position_url && !this.isValidUrl(data.position_url)) {
      throw new ApplicationValidationError('Invalid position URL');
    }
    if (data.status_url && !this.isValidUrl(data.status_url)) {
      throw new ApplicationValidationError('Invalid status URL');
    }

    const updateData: Partial<JobApplication> = {};

    if (data.position_title !== undefined) {
      updateData.position_title = data.position_title?.trim() || null;
    }
    if (data.job_link !== undefined) {
      updateData.job_link = data.job_link?.trim() || null;
    }
    if (data.position_url !== undefined) {
      updateData.position_url = data.position_url?.trim() || null;
    }
    if (data.status_url !== undefined) {
      updateData.status_url = data.status_url?.trim() || null;
    }
    if (data.work_location_type !== undefined) {
      updateData.work_location_type = data.work_location_type;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.outcome !== undefined) {
      updateData.outcome = data.outcome;
    }
    if (data.date_applied !== undefined) {
      updateData.date_applied = data.date_applied;
    }
    if (data.interview_date !== undefined) {
      updateData.interview_date = data.interview_date;
    }
    if (data.follow_up_date !== undefined) {
      updateData.follow_up_date = data.follow_up_date;
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const { data: result, error } = await this.supabase
      .from('job_applications')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return result;
  }

  /**
   * Delete a job application
   */
  async delete(id: string): Promise<void> {
    this.ensureInitialized();

    const { error } = await this.supabase
      .from('job_applications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =========================================================================
  // Company with Applications Queries
  // =========================================================================

  /**
   * Get a shared company with all its applications
   * @updated Feature 014: Uses shared_companies table and shared_company_id FK
   */
  async getSharedCompanyWithApplications(companyId: string): Promise<{
    company: UnifiedCompany;
    applications: JobApplication[];
  } | null> {
    this.ensureInitialized();

    // Get company from user_companies_unified view
    const { data: company, error: companyError } = await this.supabase
      .from('user_companies_unified')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (companyError) {
      if (companyError.code === 'PGRST116') {
        return null;
      }
      throw companyError;
    }

    // Get applications for this shared company
    const applications = await this.getByCompanyId(
      companyId,
      'shared',
      undefined,
      {
        field: 'created_at',
        direction: 'desc',
      }
    );

    return {
      company: company as UnifiedCompany,
      applications,
    };
  }

  /**
   * Get a private company with all its applications
   * @since Feature 014
   */
  async getPrivateCompanyWithApplications(companyId: string): Promise<{
    company: UnifiedCompany;
    applications: JobApplication[];
  } | null> {
    this.ensureInitialized();

    // Get company from user_companies_unified view
    const { data: company, error: companyError } = await this.supabase
      .from('user_companies_unified')
      .select('*')
      .eq('private_company_id', companyId)
      .single();

    if (companyError) {
      if (companyError.code === 'PGRST116') {
        return null;
      }
      throw companyError;
    }

    // Get applications for this private company
    const applications = await this.getByCompanyId(
      companyId,
      'private',
      undefined,
      {
        field: 'created_at',
        direction: 'desc',
      }
    );

    return {
      company: company as UnifiedCompany,
      applications,
    };
  }

  /**
   * Get applications for a unified company (handles both shared and private)
   * @since Feature 014
   */
  async getApplicationsForUnifiedCompany(
    company: UnifiedCompany
  ): Promise<JobApplication[]> {
    this.ensureInitialized();

    if (company.source === 'shared' && company.company_id) {
      return this.getByCompanyId(company.company_id, 'shared');
    } else if (company.source === 'private' && company.private_company_id) {
      return this.getByCompanyId(company.private_company_id, 'private');
    }

    return [];
  }

  /**
   * Get application statistics for dashboard
   */
  async getStatistics(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_outcome: Record<string, number>;
    by_work_location: Record<string, number>;
    applied_this_week: number;
    interviews_scheduled: number;
  }> {
    this.ensureInitialized();

    const applications = await this.getAll();

    const stats = {
      total: applications.length,
      by_status: {} as Record<string, number>,
      by_outcome: {} as Record<string, number>,
      by_work_location: {} as Record<string, number>,
      applied_this_week: 0,
      interviews_scheduled: 0,
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const app of applications) {
      // Count by status
      stats.by_status[app.status] = (stats.by_status[app.status] || 0) + 1;

      // Count by outcome
      stats.by_outcome[app.outcome] = (stats.by_outcome[app.outcome] || 0) + 1;

      // Count by work location
      stats.by_work_location[app.work_location_type] =
        (stats.by_work_location[app.work_location_type] || 0) + 1;

      // Count applied this week
      if (app.date_applied) {
        const appliedDate = new Date(app.date_applied);
        if (appliedDate >= oneWeekAgo) {
          stats.applied_this_week++;
        }
      }

      // Count scheduled interviews
      if (app.interview_date) {
        const interviewDate = new Date(app.interview_date);
        if (interviewDate >= new Date()) {
          stats.interviews_scheduled++;
        }
      }
    }

    return stats;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Apply filters to a job applications query
   * @updated Feature 014: Uses shared_company_id/private_company_id instead of company_id
   */
  private applyFilters(query: any, filters?: JobApplicationFilters) {
    if (!filters) return query;

    // Feature 014: Multi-tenant company references
    if (filters.shared_company_id) {
      query = query.eq('shared_company_id', filters.shared_company_id);
    }

    if (filters.private_company_id) {
      query = query.eq('private_company_id', filters.private_company_id);
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      query = query.in('status', statuses);
    }

    if (filters.outcome) {
      const outcomes = Array.isArray(filters.outcome)
        ? filters.outcome
        : [filters.outcome];
      query = query.in('outcome', outcomes);
    }

    if (filters.work_location_type) {
      const locations = Array.isArray(filters.work_location_type)
        ? filters.work_location_type
        : [filters.work_location_type];
      query = query.in('work_location_type', locations);
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      query = query.in('priority', priorities);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.date_applied_from) {
      query = query.gte('date_applied', filters.date_applied_from);
    }

    if (filters.date_applied_to) {
      query = query.lte('date_applied', filters.date_applied_to);
    }

    return query;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private ensureInitialized(): void {
    if (!this.userId) {
      throw new Error(
        'ApplicationService not initialized. Call initialize() first.'
      );
    }
  }
}
