/**
 * Match Service Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T062 [US2] - Tests for findSimilarCompanies() returns matches with confidence
 * T063 [US2] - Tests for fuzzy name matching (pg_trgm)
 * T064 [US2] - Tests for proximity matching
 * T065 [US2] - Tests for domain matching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiTenantCompanyService } from '@/lib/companies/multi-tenant-service';
import type { MatchResult, MatchConfidence } from '@/types/company';

// Mock Supabase client
const createMockSupabase = () => {
  const mockRpc = vi.fn();

  return {
    from: vi.fn(),
    rpc: mockRpc,
  };
};

const createMockMatchResult = (
  overrides: Partial<MatchResult> = {}
): MatchResult => ({
  company_id: 'company-1',
  company_name: 'Test Company',
  website: 'https://testcompany.com',
  careers_url: 'https://testcompany.com/careers',
  is_verified: true,
  location_id: 'location-1',
  address: '123 Test St, Cleveland, TN 37311',
  distance_miles: 2.5,
  name_similarity: 0.85,
  domain_match: false,
  confidence: 'high' as MatchConfidence,
  ...overrides,
});

describe('MultiTenantCompanyService - Match Detection (US2)', () => {
  let service: MultiTenantCompanyService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new MultiTenantCompanyService(mockSupabase as never);
  });

  describe('findSimilarCompanies (T062)', () => {
    it('returns matches with confidence levels', async () => {
      const highConfidenceMatch = createMockMatchResult({
        company_id: 'company-1',
        company_name: 'Amazon',
        name_similarity: 0.95,
        confidence: 'high',
      });
      const mediumConfidenceMatch = createMockMatchResult({
        company_id: 'company-2',
        company_name: 'Amazone Inc',
        name_similarity: 0.75,
        confidence: 'medium',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [highConfidenceMatch, mediumConfidenceMatch],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Amazon');

      expect(result).toHaveLength(2);
      expect(result[0].confidence).toBe('high');
      expect(result[1].confidence).toBe('medium');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_similar_companies', {
        p_company_name: 'Amazon',
        p_latitude: null,
        p_longitude: null,
        p_website_domain: null,
      });
    });

    it('returns empty array when no matches found', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Unique Company XYZ');

      expect(result).toHaveLength(0);
    });

    it('throws error if not initialized', async () => {
      await expect(service.findSimilarCompanies('Test')).rejects.toThrow(
        'MultiTenantCompanyService not initialized'
      );
    });

    it('propagates database errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      await service.initialize('user-1');
      await expect(service.findSimilarCompanies('Test')).rejects.toThrow(
        'Database error'
      );
    });

    it('returns empty results on timeout gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query timeout exceeded' },
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Test');

      expect(result).toHaveLength(0);
    });

    it('returns empty results when extension unavailable', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'extension pg_trgm is not available' },
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Test');

      expect(result).toHaveLength(0);
    });
  });

  describe('fuzzy name matching (T063)', () => {
    it('finds "Amazn" matching "Amazon" with similarity >= 0.3', async () => {
      const match = createMockMatchResult({
        company_name: 'Amazon',
        name_similarity: 0.8, // pg_trgm similarity for "Amazn" vs "Amazon"
        confidence: 'high',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [match],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Amazn');

      expect(result).toHaveLength(1);
      expect(result[0].company_name).toBe('Amazon');
      expect(result[0].name_similarity).toBeGreaterThanOrEqual(0.3);
    });

    it('finds partial matches for company names', async () => {
      const matches = [
        createMockMatchResult({
          company_id: '1',
          company_name: 'Whirlpool Corporation',
          name_similarity: 0.75,
        }),
        createMockMatchResult({
          company_id: '2',
          company_name: 'Whirlpool Parts',
          name_similarity: 0.65,
        }),
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: matches,
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Whirlpool');

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.name_similarity >= 0.3)).toBe(true);
    });

    it('handles case-insensitive matching', async () => {
      const match = createMockMatchResult({
        company_name: 'GOOGLE',
        name_similarity: 0.9,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [match],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('google');

      expect(result).toHaveLength(1);
      expect(result[0].company_name).toBe('GOOGLE');
    });
  });

  describe('proximity matching (T064)', () => {
    it('finds companies within 5 miles when coordinates provided', async () => {
      const nearbyMatch = createMockMatchResult({
        company_name: 'Nearby Corp',
        distance_miles: 2.5,
        confidence: 'high',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [nearbyMatch],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies(
        'Nearby Corp',
        35.1595, // latitude
        -84.8766 // longitude
      );

      expect(result).toHaveLength(1);
      expect(result[0].distance_miles).toBeLessThanOrEqual(5);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_similar_companies', {
        p_company_name: 'Nearby Corp',
        p_latitude: 35.1595,
        p_longitude: -84.8766,
        p_website_domain: null,
      });
    });

    it('boosts confidence for very close locations (< 1 mile)', async () => {
      const veryCloseMatch = createMockMatchResult({
        company_name: 'Close Company',
        distance_miles: 0.3,
        confidence: 'high',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [veryCloseMatch],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies(
        'Close Company',
        35.1595,
        -84.8766
      );

      expect(result[0].distance_miles).toBeLessThan(1);
      expect(result[0].confidence).toBe('high');
    });

    it('returns matches without distance when no coordinates provided', async () => {
      const match = createMockMatchResult({
        company_name: 'Test Corp',
        distance_miles: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [match],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Test Corp');

      expect(result[0].distance_miles).toBeNull();
    });
  });

  describe('domain matching (T065)', () => {
    it('boosts confidence when website domain matches', async () => {
      const domainMatch = createMockMatchResult({
        company_name: 'Google LLC',
        website: 'https://google.com',
        domain_match: true,
        confidence: 'high',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [domainMatch],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies(
        'Googel', // typo in name
        undefined,
        undefined,
        'google.com'
      );

      expect(result[0].domain_match).toBe(true);
      expect(result[0].confidence).toBe('high');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_similar_companies', {
        p_company_name: 'Googel',
        p_latitude: null,
        p_longitude: null,
        p_website_domain: 'google.com',
      });
    });

    it('returns domain_match false when domains differ', async () => {
      const noMatch = createMockMatchResult({
        company_name: 'Similar Corp',
        website: 'https://similarcorp.com',
        domain_match: false,
        confidence: 'medium',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [noMatch],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies(
        'Similar Corp',
        undefined,
        undefined,
        'different-domain.com'
      );

      expect(result[0].domain_match).toBe(false);
    });

    it('prioritizes exact domain matches over name similarity', async () => {
      const domainMatch = createMockMatchResult({
        company_id: '1',
        company_name: 'Acme Industries',
        website: 'https://acme.com',
        domain_match: true,
        name_similarity: 0.5,
        confidence: 'high',
      });
      const nameMatch = createMockMatchResult({
        company_id: '2',
        company_name: 'Acme Corporation',
        website: 'https://acmecorp.com',
        domain_match: false,
        name_similarity: 0.9,
        confidence: 'medium',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [domainMatch, nameMatch], // domain match first
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies(
        'Acme Corp',
        undefined,
        undefined,
        'acme.com'
      );

      // Domain match should be high confidence despite lower name similarity
      expect(result[0].domain_match).toBe(true);
      expect(result[0].confidence).toBe('high');
    });
  });

  describe('combined matching criteria', () => {
    it('uses all matching criteria together', async () => {
      const perfectMatch = createMockMatchResult({
        company_name: 'Perfect Corp',
        name_similarity: 0.95,
        distance_miles: 0.5,
        domain_match: true,
        confidence: 'high',
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [perfectMatch],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies(
        'Perfect Corp',
        35.1595,
        -84.8766,
        'perfectcorp.com'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_similar_companies', {
        p_company_name: 'Perfect Corp',
        p_latitude: 35.1595,
        p_longitude: -84.8766,
        p_website_domain: 'perfectcorp.com',
      });
      expect(result[0].confidence).toBe('high');
    });

    it('returns results sorted by confidence (high first)', async () => {
      const matches = [
        createMockMatchResult({
          company_id: '1',
          company_name: 'High Match',
          confidence: 'high',
        }),
        createMockMatchResult({
          company_id: '2',
          company_name: 'Medium Match',
          confidence: 'medium',
        }),
        createMockMatchResult({
          company_id: '3',
          company_name: 'Low Match',
          confidence: 'low',
        }),
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: matches,
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.findSimilarCompanies('Match');

      expect(result.map((m) => m.confidence)).toEqual([
        'high',
        'medium',
        'low',
      ]);
    });
  });
});
