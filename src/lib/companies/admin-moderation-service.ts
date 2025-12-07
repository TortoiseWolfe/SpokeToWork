/**
 * Admin Moderation Service - Feature 012
 *
 * Service for admin-only moderation of company contributions and edit suggestions.
 * Requires admin role to use.
 *
 * @see specs/012-multi-tenant-companies/data-model.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CompanyContribution,
  CompanyEditSuggestion,
  ContributionStatus,
} from '@/types/company';

/**
 * Pending item in moderation queue
 */
export interface ModerationQueueItem {
  id: string;
  type: 'contribution' | 'edit_suggestion';
  user_id: string;
  status: ContributionStatus;
  created_at: string;
  // Contribution-specific
  private_company_id?: string;
  private_company_name?: string;
  // Edit suggestion-specific
  shared_company_id?: string;
  shared_company_name?: string;
  field_name?: string;
  old_value?: string | null;
  new_value?: string;
  reason?: string | null;
}

/**
 * Admin Moderation Service
 */
export class AdminModerationService {
  private supabase: SupabaseClient;
  private userId: string | null = null;
  private isAdmin: boolean = false;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Initialize service with admin user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    // In production, check if user has admin role
    // For now, we'll assume the check is done by RLS
    this.isAdmin = true;
  }

  /**
   * Ensure service is initialized with admin user
   */
  private ensureInitialized(): void {
    if (!this.userId) {
      throw new Error('AdminModerationService not initialized');
    }
  }

  // ===========================================================================
  // Moderation Queue
  // ===========================================================================

  /**
   * Get pending contributions and edit suggestions
   */
  async getPendingQueue(): Promise<ModerationQueueItem[]> {
    this.ensureInitialized();

    // Get pending contributions
    const { data: contributions, error: contribError } = await this.supabase
      .from('company_contributions')
      .select(
        `
        id,
        user_id,
        private_company_id,
        status,
        created_at,
        private_companies(name)
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (contribError) {
      throw contribError;
    }

    // Get pending edit suggestions
    const { data: suggestions, error: suggError } = await this.supabase
      .from('company_edit_suggestions')
      .select(
        `
        id,
        user_id,
        shared_company_id,
        field_name,
        old_value,
        new_value,
        reason,
        status,
        created_at,
        shared_companies(name)
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (suggError) {
      throw suggError;
    }

    // Combine and format
    const queue: ModerationQueueItem[] = [];

    for (const c of contributions ?? []) {
      const privateCompany = c.private_companies as
        | { name: string }
        | { name: string }[]
        | null;
      const companyName = Array.isArray(privateCompany)
        ? privateCompany[0]?.name
        : privateCompany?.name;
      queue.push({
        id: c.id,
        type: 'contribution',
        user_id: c.user_id,
        status: c.status,
        created_at: c.created_at,
        private_company_id: c.private_company_id,
        private_company_name: companyName,
      });
    }

    for (const s of suggestions ?? []) {
      const sharedCompany = s.shared_companies as
        | { name: string }
        | { name: string }[]
        | null;
      const companyName = Array.isArray(sharedCompany)
        ? sharedCompany[0]?.name
        : sharedCompany?.name;
      queue.push({
        id: s.id,
        type: 'edit_suggestion',
        user_id: s.user_id,
        status: s.status,
        created_at: s.created_at,
        shared_company_id: s.shared_company_id,
        shared_company_name: companyName,
        field_name: s.field_name,
        old_value: s.old_value,
        new_value: s.new_value,
        reason: s.reason,
      });
    }

    // Sort by created_at
    queue.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return queue;
  }

  // ===========================================================================
  // Contribution Actions
  // ===========================================================================

  /**
   * Approve a contribution - creates new shared company from private
   */
  async approveContribution(
    contributionId: string,
    notes?: string
  ): Promise<CompanyContribution> {
    this.ensureInitialized();

    // Get the contribution and private company data
    const { data: contribution, error: fetchError } = await this.supabase
      .from('company_contributions')
      .select(
        `
        *,
        private_companies(*)
      `
      )
      .eq('id', contributionId)
      .single();

    if (fetchError || !contribution) {
      throw fetchError ?? new Error('Contribution not found');
    }

    const privateCompany = contribution.private_companies;

    // Create new shared company
    const { data: newShared, error: createError } = await this.supabase
      .from('shared_companies')
      .insert({
        metro_area_id: privateCompany.metro_area_id,
        name: privateCompany.name,
        website: privateCompany.website,
        careers_url: privateCompany.careers_url,
        is_verified: true,
        is_seed: false,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Update contribution status
    const { data: updated, error: updateError } = await this.supabase
      .from('company_contributions')
      .update({
        status: 'approved',
        reviewer_id: this.userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes ?? null,
        created_shared_company_id: newShared.id,
      })
      .eq('id', contributionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updated as CompanyContribution;
  }

  /**
   * Reject a contribution
   */
  async rejectContribution(
    contributionId: string,
    notes: string
  ): Promise<CompanyContribution> {
    this.ensureInitialized();

    const { data, error } = await this.supabase
      .from('company_contributions')
      .update({
        status: 'rejected',
        reviewer_id: this.userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes,
      })
      .eq('id', contributionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as CompanyContribution;
  }

  /**
   * Merge contribution with existing shared company
   */
  async mergeContribution(
    contributionId: string,
    existingCompanyId: string,
    notes?: string
  ): Promise<CompanyContribution> {
    this.ensureInitialized();

    const { data, error } = await this.supabase
      .from('company_contributions')
      .update({
        status: 'merged',
        reviewer_id: this.userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes ?? null,
        merged_with_company_id: existingCompanyId,
      })
      .eq('id', contributionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as CompanyContribution;
  }

  // ===========================================================================
  // Edit Suggestion Actions
  // ===========================================================================

  /**
   * Approve an edit suggestion - applies the change
   */
  async approveEditSuggestion(
    suggestionId: string,
    notes?: string
  ): Promise<CompanyEditSuggestion> {
    this.ensureInitialized();

    // Get the suggestion
    const { data: suggestion, error: fetchError } = await this.supabase
      .from('company_edit_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (fetchError || !suggestion) {
      throw fetchError ?? new Error('Edit suggestion not found');
    }

    // Apply the change to shared company
    const { error: updateError } = await this.supabase
      .from('shared_companies')
      .update({ [suggestion.field_name]: suggestion.new_value })
      .eq('id', suggestion.shared_company_id);

    if (updateError) {
      throw updateError;
    }

    // Update suggestion status
    const { data: updated, error: statusError } = await this.supabase
      .from('company_edit_suggestions')
      .update({
        status: 'approved',
        reviewer_id: this.userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes ?? null,
      })
      .eq('id', suggestionId)
      .select()
      .single();

    if (statusError) {
      throw statusError;
    }

    return updated as CompanyEditSuggestion;
  }

  /**
   * Reject an edit suggestion
   */
  async rejectEditSuggestion(
    suggestionId: string,
    notes: string
  ): Promise<CompanyEditSuggestion> {
    this.ensureInitialized();

    const { data, error } = await this.supabase
      .from('company_edit_suggestions')
      .update({
        status: 'rejected',
        reviewer_id: this.userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes,
      })
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as CompanyEditSuggestion;
  }

  // ===========================================================================
  // Queue Statistics
  // ===========================================================================

  /**
   * Get counts of pending items by type
   */
  async getPendingCounts(): Promise<{
    contributions: number;
    editSuggestions: number;
    total: number;
  }> {
    this.ensureInitialized();

    const { count: contribCount, error: contribError } = await this.supabase
      .from('company_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (contribError) {
      throw contribError;
    }

    const { count: suggCount, error: suggError } = await this.supabase
      .from('company_edit_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (suggError) {
      throw suggError;
    }

    return {
      contributions: contribCount ?? 0,
      editSuggestions: suggCount ?? 0,
      total: (contribCount ?? 0) + (suggCount ?? 0),
    };
  }
}
