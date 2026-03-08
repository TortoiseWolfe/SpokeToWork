import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ModerationDetailPanel } from './ModerationDetailPanel';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';
import type { NearbyLocation } from '@/lib/companies/nearby-locations';

expect.extend(toHaveNoViolations);

const contribution: ModerationQueueItem = {
  id: 'c1',
  type: 'contribution',
  user_id: 'u1',
  status: 'pending',
  created_at: '2026-01-01T12:00:00Z',
  private_company_id: 'pc-1',
  private_company_name: 'A11y Test Co',
  latitude: 51.5,
  longitude: -0.1,
  address: '1 Test St',
};

const nearby: NearbyLocation[] = [
  {
    id: 'loc-1',
    shared_company_id: 'sc-1',
    shared_company_name: 'Nearby Co',
    latitude: 51.505,
    longitude: -0.1,
    address: '2 Near Rd',
    is_headquarters: true,
  },
];

describe('ModerationDetailPanel Accessibility', () => {
  it('has no axe violations with candidates', async () => {
    const { container } = render(
      <ModerationDetailPanel
        contribution={contribution}
        nearbyLocations={nearby}
        onApprove={async () => {}}
        onReject={async () => {}}
        onMerge={async () => {}}
        onClose={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with empty candidate list', async () => {
    const { container } = render(
      <ModerationDetailPanel
        contribution={contribution}
        nearbyLocations={[]}
        onApprove={async () => {}}
        onReject={async () => {}}
        onMerge={async () => {}}
        onClose={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
