import { describe, it, expect } from 'vitest';
import {
  isUnifiedCompany,
  getCompanyId,
  toCompanyWithApplications,
} from './company-identity';
import type { UnifiedCompany, CompanyWithApplications } from '@/types/company';

const sharedCompany: UnifiedCompany = {
  source: 'shared',
  company_id: 'shared-1',
  tracking_id: 'track-1',
  private_company_id: null,
  user_id: 'user-1',
  metro_area_id: null,
  primary_industry_id: null,
  name: 'Acme Shared',
  address: '123 Main St',
  latitude: 40.7128,
  longitude: -74.006,
  website: null,
  careers_url: null,
  email: null,
  phone: null,
  contact_name: null,
  contact_title: null,
  notes: null,
  status: 'not_contacted',
  priority: 3,
  follow_up_date: null,
  is_active: true,
  is_verified: false,
  submit_to_shared: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const privateCompany: UnifiedCompany = {
  ...sharedCompany,
  source: 'private',
  company_id: null,
  tracking_id: null,
  private_company_id: 'priv-1',
  name: 'Acme Private',
};

describe('isUnifiedCompany', () => {
  it('returns true for object with source + tracking_id', () => {
    expect(isUnifiedCompany(sharedCompany)).toBe(true);
  });

  it('returns true for object with source + private_company_id', () => {
    expect(isUnifiedCompany(privateCompany)).toBe(true);
  });

  it('returns false for plain CompanyWithApplications', () => {
    const plain = { id: 'x', name: 'Y' } as CompanyWithApplications;
    expect(isUnifiedCompany(plain)).toBe(false);
  });
});

describe('getCompanyId', () => {
  it('returns tracking_id for shared companies', () => {
    expect(getCompanyId(sharedCompany)).toBe('track-1');
  });

  it('returns private_company_id for private companies', () => {
    expect(getCompanyId(privateCompany)).toBe('priv-1');
  });

  it('throws when both identifiers are missing', () => {
    const broken = { ...sharedCompany, tracking_id: null } as UnifiedCompany;
    expect(() => getCompanyId(broken)).toThrow('Invalid company');
  });
});

describe('toCompanyWithApplications', () => {
  it('maps shared company to CompanyWithApplications shape', () => {
    const result = toCompanyWithApplications(sharedCompany);
    expect(result.id).toBe('track-1');
    expect(result.name).toBe('Acme Shared');
    expect(result.latitude).toBe(40.7128);
    expect(result.applications).toEqual([]);
    expect(result.total_applications).toBe(0);
  });

  it('coerces null coordinates to 0', () => {
    const noCoords: UnifiedCompany = {
      ...sharedCompany,
      latitude: null,
      longitude: null,
    };
    const result = toCompanyWithApplications(noCoords);
    expect(result.latitude).toBe(0);
    expect(result.longitude).toBe(0);
  });
});
