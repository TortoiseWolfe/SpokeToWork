import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { UnifiedCompany } from '@/types/company';
import { CompanyListCompact } from './CompanyListCompact';

const co = (over: Partial<UnifiedCompany>): UnifiedCompany =>
  ({
    source: 'private',
    private_company_id: 'p1',
    name: 'Acme',
    address: '1 Main St',
    latitude: 51.5,
    longitude: -0.1,
    is_active: true,
    priority: 3,
    status: 'not_contacted',
    ...over,
  }) as UnifiedCompany;

describe('CompanyListCompact', () => {
  it('renders one row per company', () => {
    render(
      <CompanyListCompact
        companies={[
          co({ private_company_id: 'p1', name: 'Acme' }),
          co({ private_company_id: 'p2', name: 'Beta' }),
        ]}
        onCompanyClick={vi.fn()}
      />
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('calls onCompanyClick with the company when a row is tapped', () => {
    const onClick = vi.fn();
    const acme = co({ private_company_id: 'p1', name: 'Acme' });
    render(<CompanyListCompact companies={[acme]} onCompanyClick={onClick} />);
    fireEvent.click(screen.getByText('Acme'));
    expect(onClick).toHaveBeenCalledWith(acme);
  });

  it('shows the active-route indicator when company is in the set', () => {
    render(
      <CompanyListCompact
        companies={[co({ private_company_id: 'p1', name: 'Acme' })]}
        activeRouteCompanyIds={new Set(['p1'])}
        onCompanyClick={vi.fn()}
      />
    );
    expect(screen.getByTitle('On active route')).toBeInTheDocument();
  });

  it('omits the indicator when company is not in the set', () => {
    render(
      <CompanyListCompact
        companies={[co({ private_company_id: 'p1', name: 'Acme' })]}
        activeRouteCompanyIds={new Set(['other'])}
        onCompanyClick={vi.fn()}
      />
    );
    expect(screen.queryByTitle('On active route')).not.toBeInTheDocument();
  });

  it('highlights the selected row', () => {
    render(
      <CompanyListCompact
        companies={[
          co({ private_company_id: 'p1', name: 'Acme' }),
          co({ private_company_id: 'p2', name: 'Beta' }),
        ]}
        selectedCompanyId="p2"
        onCompanyClick={vi.fn()}
      />
    );
    expect(screen.getByTestId('compact-row-p2').className).toMatch(
      /bg-primary\/10/
    );
    expect(screen.getByTestId('compact-row-p1').className).not.toMatch(
      /bg-primary\/10/
    );
  });
});
