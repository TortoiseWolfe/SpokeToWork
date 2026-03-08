import { describe, it, expect } from 'vitest';
import { getUnifiedCompanyId } from './company-id';
import type { UnifiedCompany } from '@/types/company';

const base: Omit<
  UnifiedCompany,
  'source' | 'tracking_id' | 'company_id' | 'private_company_id'
> = {
  user_id: 'u1',
  metro_area_id: null,
  name: 'Test Co',
  website: null,
  careers_url: null,
  address: '123 Main',
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  contact_name: null,
  contact_title: null,
  notes: null,
  status: 'not_contacted',
  priority: 3,
  follow_up_date: null,
  is_active: true,
  is_verified: false,
  submit_to_shared: false,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('getUnifiedCompanyId', () => {
  it('returns tracking_id for shared companies', () => {
    const c: UnifiedCompany = {
      ...base,
      source: 'shared',
      tracking_id: 't-1',
      company_id: 'c-1',
      private_company_id: null,
    };
    expect(getUnifiedCompanyId(c)).toBe('t-1');
  });

  it('returns private_company_id for private companies', () => {
    const c: UnifiedCompany = {
      ...base,
      source: 'private',
      tracking_id: null,
      company_id: null,
      private_company_id: 'p-1',
    };
    expect(getUnifiedCompanyId(c)).toBe('p-1');
  });

  it('throws when shared company has no tracking_id', () => {
    const c: UnifiedCompany = {
      ...base,
      source: 'shared',
      tracking_id: null,
      company_id: 'c-1',
      private_company_id: null,
    };
    expect(() => getUnifiedCompanyId(c)).toThrow('missing identifier');
  });

  it('throws when private company has no private_company_id', () => {
    const c: UnifiedCompany = {
      ...base,
      source: 'private',
      tracking_id: null,
      company_id: null,
      private_company_id: null,
    };
    expect(() => getUnifiedCompanyId(c)).toThrow('missing identifier');
  });
});
