import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import type { UnifiedCompany } from '@/types/company';
import { CompanyListCompact } from './CompanyListCompact';

const company = {
  source: 'private',
  private_company_id: 'p1',
  name: 'Acme',
  address: '1 Main St',
  is_active: true,
  priority: 3,
  status: 'not_contacted',
} as UnifiedCompany;

describe('CompanyListCompact — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <CompanyListCompact
        companies={[company]}
        onCompanyClick={vi.fn()}
        activeRouteCompanyIds={new Set(['p1'])}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
