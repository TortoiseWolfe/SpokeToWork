/**
 * Seed Service - Feature 012
 *
 * Service for managing seed company data for new users.
 * Provides starter companies when users sign up for a metro area.
 *
 * @see specs/012-multi-tenant-companies/data-model.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SharedCompany, UserCompanyTracking } from '@/types/company';

/**
 * Metro area with seed company count
 */
export interface MetroAreaWithSeedCount {
  id: string;
  name: string;
  seed_company_count: number;
}

/**
 * Seed Service
 */
export class SeedService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get seed companies for a metro area (T087)
   * Returns verified companies marked as seed data
   */
  async getSeedCompaniesForMetro(
    metroAreaId: string
  ): Promise<SharedCompany[]> {
    const { data, error } = await this.supabase
      .from('shared_companies')
      .select('*')
      .eq('metro_area_id', metroAreaId)
      .eq('is_seed', true)
      .eq('is_verified', true)
      .order('name');

    if (error) {
      throw error;
    }

    return data as SharedCompany[];
  }

  /**
   * Get count of seed companies for a metro area
   */
  async getSeedCompanyCount(metroAreaId: string): Promise<number> {
    const companies = await this.getSeedCompaniesForMetro(metroAreaId);
    return companies.length;
  }

  /**
   * Create tracking records for all seed companies in a metro area
   * Called when a new user signs up and selects a metro area
   */
  async createTrackingForSeedCompanies(
    userId: string,
    metroAreaId: string
  ): Promise<UserCompanyTracking[]> {
    // Get all seed companies for the metro area
    const seedCompanies = await this.getSeedCompaniesForMetro(metroAreaId);

    if (seedCompanies.length === 0) {
      return [];
    }

    // Create tracking records for each seed company
    const trackingRecords = seedCompanies.map((company) => ({
      user_id: userId,
      shared_company_id: company.id,
      status: 'not_contacted' as const,
      priority: 3,
      is_active: true,
    }));

    const { data, error } = await this.supabase
      .from('user_company_tracking')
      .insert(trackingRecords)
      .select();

    // Ignore duplicate key errors (user already has tracking)
    if (error && error.code !== '23505') {
      throw error;
    }

    return (data ?? []) as UserCompanyTracking[];
  }

  /**
   * Get metro areas that have seed data available
   */
  async getAvailableMetroAreas(): Promise<MetroAreaWithSeedCount[]> {
    const { data, error } = await this.supabase.rpc(
      'get_metro_areas_with_seed_count'
    );

    if (error) {
      throw error;
    }

    return data as MetroAreaWithSeedCount[];
  }
}
