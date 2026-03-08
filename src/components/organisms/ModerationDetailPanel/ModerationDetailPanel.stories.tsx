import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ModerationDetailPanel } from './ModerationDetailPanel';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';
import type { NearbyLocation } from '@/lib/companies/nearby-locations';

const meta: Meta<typeof ModerationDetailPanel> = {
  title: 'Atomic Design/Organism/ModerationDetailPanel',
  component: ModerationDetailPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onApprove: { action: 'approve' },
    onReject: { action: 'reject' },
    onMerge: { action: 'merge' },
    onClose: { action: 'close' },
  },
};

export default meta;
type Story = StoryObj<typeof ModerationDetailPanel>;

const contribution: ModerationQueueItem = {
  id: 'c1',
  type: 'contribution',
  user_id: 'u1',
  status: 'pending',
  created_at: '2026-01-01T12:00:00Z',
  private_company_id: 'pc-1',
  private_company_name: 'New Welding Co',
  latitude: 51.5,
  longitude: -0.1,
  address: '1 High St, London EC1',
  phone: '020 7946 0100',
  email: 'hello@newwelding.test',
  website: 'https://newwelding.test',
  notes: 'Submitted by field rep. Verified by phone.',
};

const nearby: NearbyLocation[] = [
  {
    id: 'loc-1',
    shared_company_id: 'sc-1',
    shared_company_name: 'Existing Weld Ltd',
    latitude: 51.505,
    longitude: -0.1,
    address: '2 Nearby Rd, London EC1',
    is_headquarters: true,
  },
  {
    id: 'loc-2',
    shared_company_id: 'sc-2',
    shared_company_name: 'Metro Fabrication',
    latitude: 51.51,
    longitude: -0.095,
    address: '14 Side St, London EC2',
    is_headquarters: false,
  },
];

export const Default: Story = {
  args: {
    contribution,
    nearbyLocations: nearby,
  },
};

export const NoCandidates: Story = {
  args: {
    contribution,
    nearbyLocations: [],
  },
};

export const NoCoordinates: Story = {
  args: {
    contribution: { ...contribution, latitude: null, longitude: null },
    nearbyLocations: nearby,
  },
};
