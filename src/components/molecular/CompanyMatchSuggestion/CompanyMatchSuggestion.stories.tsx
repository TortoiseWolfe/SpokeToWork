import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CompanyMatchSuggestion from './CompanyMatchSuggestion';
import type { MatchResult, MatchConfidence } from '@/types/company';

const meta: Meta<typeof CompanyMatchSuggestion> = {
  title: 'Atomic Design/Molecular/CompanyMatchSuggestion',
  component: CompanyMatchSuggestion,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Displays match suggestions when adding a new company, allowing users to track an existing company or add as new.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onTrack: { action: 'track' },
    onAddNew: { action: 'addNew' },
  },
};

export default meta;
type Story = StoryObj<typeof CompanyMatchSuggestion>;

const createMockMatch = (
  overrides: Partial<MatchResult> = {}
): MatchResult => ({
  company_id: 'company-123',
  company_name: 'Test Corp',
  website: 'https://testcorp.com',
  careers_url: 'https://testcorp.com/careers',
  is_verified: true,
  location_id: 'loc-123',
  address: '123 Test St, Cleveland, TN 37311',
  distance_miles: 2.5,
  name_similarity: 0.85,
  domain_match: false,
  confidence: 'high' as MatchConfidence,
  ...overrides,
});

export const SingleHighMatch: Story = {
  args: {
    matches: [
      createMockMatch({
        company_name: 'Amazon Web Services',
        confidence: 'high',
        distance_miles: 1.2,
        is_verified: true,
        domain_match: true,
      }),
    ],
  },
};

export const MultipleMatches: Story = {
  args: {
    matches: [
      createMockMatch({
        company_id: '1',
        company_name: 'Whirlpool Corporation',
        confidence: 'high',
        distance_miles: 0.5,
        is_verified: true,
        domain_match: true,
      }),
      createMockMatch({
        company_id: '2',
        company_name: 'Whirlpool Parts & Service',
        confidence: 'medium',
        distance_miles: 3.2,
        is_verified: false,
        domain_match: false,
      }),
      createMockMatch({
        company_id: '3',
        company_name: 'Whirlpool Outlet Store',
        confidence: 'low',
        distance_miles: 8.5,
        is_verified: false,
        domain_match: false,
      }),
    ],
  },
};

export const MediumConfidence: Story = {
  args: {
    matches: [
      createMockMatch({
        company_name: 'Google LLC',
        confidence: 'medium',
        distance_miles: 5.0,
        is_verified: true,
      }),
    ],
  },
};

export const LowConfidence: Story = {
  args: {
    matches: [
      createMockMatch({
        company_name: 'Similar Company Inc',
        confidence: 'low',
        distance_miles: null,
        is_verified: false,
      }),
    ],
  },
};

export const WithDomainMatch: Story = {
  args: {
    matches: [
      createMockMatch({
        company_name: 'Acme Industries',
        confidence: 'high',
        domain_match: true,
        distance_miles: 2.0,
        is_verified: true,
      }),
    ],
  },
};

export const NoDistance: Story = {
  args: {
    matches: [
      createMockMatch({
        company_name: 'Remote Company',
        confidence: 'medium',
        distance_miles: null,
        address: null,
      }),
    ],
  },
};

export const Loading: Story = {
  args: {
    matches: [createMockMatch()],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    matches: [],
  },
};
