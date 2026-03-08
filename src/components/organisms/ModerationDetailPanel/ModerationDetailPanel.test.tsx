import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationDetailPanel } from './ModerationDetailPanel';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';
import type { NearbyLocation } from '@/lib/companies/nearby-locations';

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
  address: '1 High St',
  phone: '555-0100',
  email: 'hi@newweld.test',
  website: 'https://newweld.test',
  notes: 'Found via cold call',
};

// loc-near: ~1.1km from contribution (51.5, -0.1)
// loc-far:  ~15km — should be filtered out
const nearby: NearbyLocation[] = [
  {
    id: 'loc-near',
    shared_company_id: 'sc-1',
    shared_company_name: 'Existing Weld Ltd',
    latitude: 51.51,
    longitude: -0.1,
    address: '2 Nearby Rd',
    is_headquarters: true,
  },
  {
    id: 'loc-far',
    shared_company_id: 'sc-2',
    shared_company_name: 'Distant Co',
    latitude: 51.64,
    longitude: -0.1,
    address: '99 Far Ave',
    is_headquarters: false,
  },
];

describe('ModerationDetailPanel', () => {
  describe('contribution record', () => {
    it('renders company name, address, and contact fields', () => {
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('New Welding Co')).toBeInTheDocument();
      expect(screen.getByText('1 High St')).toBeInTheDocument();
      expect(screen.getByText('555-0100')).toBeInTheDocument();
      expect(screen.getByText('hi@newweld.test')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('approve button calls onApprove with contribution id', async () => {
      const onApprove = vi.fn().mockResolvedValue(undefined);
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[]}
          onApprove={onApprove}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /approve/i }));
      await waitFor(() => expect(onApprove).toHaveBeenCalledWith('c1'));
    });

    it('reject requires notes — button disabled when textarea empty', () => {
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
      fireEvent.change(screen.getByLabelText(/rejection reason/i), {
        target: { value: 'duplicate' },
      });
      expect(
        screen.getByRole('button', { name: /reject/i })
      ).not.toBeDisabled();
    });
  });

  describe('merge candidate list', () => {
    it('filters to locations within 5km of this contribution', () => {
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={nearby}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('Existing Weld Ltd')).toBeInTheDocument();
      expect(screen.queryByText('Distant Co')).not.toBeInTheDocument();
    });

    it('dedups by shared_company_id, shows nearest address + count badge', () => {
      const twoLocsOneCompany: NearbyLocation[] = [
        {
          ...nearby[0],
          id: 'loc-a',
          latitude: 51.52,
          address: 'Further office',
        }, // ~2.2km
        {
          ...nearby[0],
          id: 'loc-b',
          latitude: 51.505,
          address: 'Closer office',
        }, // ~0.55km
      ];
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={twoLocsOneCompany}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getAllByText('Existing Weld Ltd')).toHaveLength(1);
      expect(screen.getByText('Closer office')).toBeInTheDocument();
      expect(screen.queryByText('Further office')).not.toBeInTheDocument();
      expect(screen.getByText(/2 locations/i)).toBeInTheDocument();
    });

    it('shows empty state when no candidates in range', () => {
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[nearby[1]]} // only the far one
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(
        screen.getByText(/no approved companies nearby/i)
      ).toBeInTheDocument();
    });

    it('skips distance filter entirely when contribution has no coords', () => {
      render(
        <ModerationDetailPanel
          contribution={{ ...contribution, latitude: null, longitude: null }}
          nearbyLocations={nearby}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      // Can't compute distance without a reference point. Show nothing.
      expect(
        screen.getByText(/no approved companies nearby/i)
      ).toBeInTheDocument();
    });
  });

  describe('two-step merge', () => {
    it('clicking a candidate arms it, Confirm Merge enables', () => {
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[nearby[0]]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(
        screen.getByRole('button', { name: /confirm merge/i })
      ).toBeDisabled();
      fireEvent.click(screen.getByTestId('merge-candidate-sc-1'));
      expect(
        screen.getByRole('button', { name: /confirm merge/i })
      ).not.toBeDisabled();
    });

    it('clicking the same candidate again disarms', () => {
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[nearby[0]]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      const row = screen.getByTestId('merge-candidate-sc-1');
      fireEvent.click(row);
      fireEvent.click(row);
      expect(
        screen.getByRole('button', { name: /confirm merge/i })
      ).toBeDisabled();
    });

    it('Confirm Merge calls onMerge with (contributionId, sharedCompanyId)', async () => {
      const onMerge = vi.fn().mockResolvedValue(undefined);
      render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[nearby[0]]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={onMerge}
          onClose={vi.fn()}
        />
      );
      fireEvent.click(screen.getByTestId('merge-candidate-sc-1'));
      fireEvent.click(screen.getByRole('button', { name: /confirm merge/i }));
      await waitFor(() => expect(onMerge).toHaveBeenCalledWith('c1', 'sc-1'));
    });

    it('resets merge arm when contribution prop changes', () => {
      const { rerender } = render(
        <ModerationDetailPanel
          contribution={contribution}
          nearbyLocations={[nearby[0]]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      fireEvent.click(screen.getByTestId('merge-candidate-sc-1'));
      expect(
        screen.getByRole('button', { name: /confirm merge/i })
      ).not.toBeDisabled();

      rerender(
        <ModerationDetailPanel
          contribution={{ ...contribution, id: 'c2' }}
          nearbyLocations={[nearby[0]]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onMerge={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(
        screen.getByRole('button', { name: /confirm merge/i })
      ).toBeDisabled();
    });
  });
});
