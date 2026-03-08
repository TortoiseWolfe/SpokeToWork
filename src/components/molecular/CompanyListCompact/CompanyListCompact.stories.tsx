import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { UnifiedCompany } from '@/types/company';
import { CompanyListCompact } from './CompanyListCompact';

const meta: Meta<typeof CompanyListCompact> = {
  title: 'Molecular/CompanyListCompact',
  component: CompanyListCompact,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
export default meta;

type Story = StoryObj<typeof CompanyListCompact>;

const companies = [
  { source: 'private', private_company_id: 'p1', name: 'Acme Labs', address: '1 Main St, London', is_active: true, priority: 3, status: 'not_contacted' },
  { source: 'private', private_company_id: 'p2', name: 'Beta Corp', address: '22 High Rd, Cambridge', is_active: true, priority: 2, status: 'contacted' },
  { source: 'shared', tracking_id: 't3', company_id: 's3', name: 'Gamma Industries', address: '300 Park Ave, Oxford', is_active: true, priority: 1, status: 'follow_up' },
] as unknown as UnifiedCompany[];

export const Default: Story = {
  args: {
    companies,
    onCompanyClick: fn(),
  },
};

export const WithActiveRoute: Story = {
  args: {
    companies,
    activeRouteCompanyIds: new Set(['p1', 't3']),
    onCompanyClick: fn(),
  },
};

export const WithSelection: Story = {
  args: {
    companies,
    selectedCompanyId: 'p2',
    onCompanyClick: fn(),
  },
};
